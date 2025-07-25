"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
const server_1 = require("next/server");
const company_info_service_1 = require("@/services/company-info.service");
// GET: 会社情報取得
async function GET(request) {
    try {
        const companyInfoService = new company_info_service_1.CompanyInfoService();
        const companyInfo = await companyInfoService.getCompanyInfo();
        if (!companyInfo) {
            return server_1.NextResponse.json({
                success: true,
                company_info: null,
                message: '会社情報が未設定です',
            });
        }
        // フロントエンドが期待する形式に変換
        const formattedInfo = companyInfo ? {
            ...companyInfo,
            name: companyInfo.companyName,
            postal_code: companyInfo.postalCode,
            address: companyInfo.address1 || `${companyInfo.prefecture || ''} ${companyInfo.city || ''} ${companyInfo.address1 || ''}`.trim() || '',
            phone_number: companyInfo.phone,
            fax_number: companyInfo.fax,
            email: companyInfo.email,
            tax_number: companyInfo.registrationNumber,
            invoice_prefix: companyInfo.invoicePrefix || companyInfo.invoiceNumberFormat,
            representative: companyInfo.representative,
            website: companyInfo.website,
            fiscal_year_end: companyInfo.fiscalYearEnd,
            established_date: companyInfo.establishedDate,
            capital: companyInfo.capital,
            payment_terms: companyInfo.paymentTerms,
            invoice_notes: companyInfo.invoiceNotes,
            logo_image: companyInfo.logoImage,
            stamp_image: companyInfo.stampImage,
            quote_validity_days: companyInfo.quoteValidityDays,
        } : null;
        console.log('GET response - Key fields:', {
            established_date: formattedInfo?.established_date,
            capital: formattedInfo?.capital,
            fiscal_year_end: formattedInfo?.fiscal_year_end,
        });
        return server_1.NextResponse.json({
            success: true,
            companyInfo: formattedInfo,
        });
    }
    catch (error) {
        console.error('Error fetching company info:', error);
        return server_1.NextResponse.json({
            success: false,
            error: '会社情報の取得に失敗しました',
        }, { status: 500 });
    }
}
// POST: 会社情報作成・更新
async function POST(request) {
    try {
        const body = await request.json();
        const companyInfoService = new company_info_service_1.CompanyInfoService();
        // バリデーション
        const requiredFields = ['company_name', 'postal_code', 'address'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return server_1.NextResponse.json({
                    success: false,
                    error: `${field}は必須です`,
                }, { status: 400 });
            }
        }
        // 郵便番号のバリデーション
        if (!/^\d{3}-?\d{4}$/.test(body.postal_code)) {
            return server_1.NextResponse.json({
                success: false,
                error: '郵便番号の形式が無効です（例: 123-4567）',
            }, { status: 400 });
        }
        // 会社情報を更新または作成
        const companyInfo = await companyInfoService.upsertCompanyInfo({
            companyName: body.company_name,
            postalCode: body.postal_code,
            address: body.address,
            phone: body.phone || null,
            email: body.email || null,
            registrationNumber: body.registration_number || null,
            invoiceNumberFormat: body.invoice_number_format || null,
        });
        // フロントエンドが期待する形式に変換
        const formattedInfo = {
            ...companyInfo,
            name: companyInfo.companyName,
            postal_code: companyInfo.postalCode,
            address: companyInfo.address1 || `${companyInfo.prefecture || ''} ${companyInfo.city || ''} ${companyInfo.address1 || ''}`.trim() || '',
            phone_number: companyInfo.phone,
            email: companyInfo.email,
            tax_number: companyInfo.registrationNumber,
            invoice_prefix: companyInfo.invoicePrefix || companyInfo.invoiceNumberFormat,
            representative: companyInfo.representative,
            website: companyInfo.website,
            fiscal_year_end: companyInfo.fiscalYearEnd,
            payment_terms: companyInfo.paymentTerms,
            invoice_notes: companyInfo.invoiceNotes,
            logo_image: companyInfo.logoImage,
            stamp_image: companyInfo.stampImage,
        };
        return server_1.NextResponse.json({
            success: true,
            company_info: formattedInfo,
            message: '会社情報を保存しました',
        });
    }
    catch (error) {
        console.error('Error saving company info:', error);
        return server_1.NextResponse.json({
            success: false,
            error: '会社情報の保存に失敗しました',
        }, { status: 500 });
    }
}
// PUT: 会社情報更新
async function PUT(request) {
    try {
        const body = await request.json();
        const companyInfoService = new company_info_service_1.CompanyInfoService();
        // 音声認識設定のみの更新かチェック
        const isSpeechSettingsOnly = body.speech_settings &&
            !body.name &&
            !body.postal_code &&
            !body.address;
        if (!isSpeechSettingsOnly) {
            // 通常の会社情報更新時のバリデーション
            const requiredFields = ['name', 'postal_code', 'address'];
            for (const field of requiredFields) {
                if (!body[field]) {
                    return server_1.NextResponse.json({
                        success: false,
                        error: `${field}は必須です`,
                    }, { status: 400 });
                }
            }
            // 郵便番号のバリデーション
            if (!/^\d{3}-?\d{4}$/.test(body.postal_code)) {
                return server_1.NextResponse.json({
                    success: false,
                    error: '郵便番号の形式が無効です（例: 123-4567）',
                }, { status: 400 });
            }
        }
        else {
            // 音声認識設定のみの更新時は既存の会社情報の存在確認
            const existingInfo = await companyInfoService.getCompanyInfo();
            if (!existingInfo) {
                // 会社情報が存在しない場合は、最小限の会社情報で初期化
                console.log('Creating minimal company info for speech settings');
                const minimalCompanyInfo = await companyInfoService.upsertCompanyInfo({
                    companyName: 'デフォルト会社',
                    postalCode: '000-0000',
                    address1: '未設定',
                    speechSettings: body.speech_settings ? {
                        aiPromptEnhancement: body.speech_settings.ai_prompt_enhancement ? {
                            enabled: body.speech_settings.ai_prompt_enhancement.enabled ?? true,
                            customPromptInstructions: body.speech_settings.ai_prompt_enhancement.custom_prompt_instructions || null,
                            contextAwareHomophoneCorrection: body.speech_settings.ai_prompt_enhancement.context_aware_homophone_correction ?? true,
                            businessContextInstructions: body.speech_settings.ai_prompt_enhancement.business_context_instructions || null,
                        } : undefined,
                        dictionaryCorrection: body.speech_settings.dictionary_correction ? {
                            enabled: body.speech_settings.dictionary_correction.enabled ?? true,
                            customDictionary: body.speech_settings.dictionary_correction.custom_dictionary || [],
                        } : undefined,
                    } : null,
                });
                const formattedInfo = {
                    ...minimalCompanyInfo,
                    name: minimalCompanyInfo.companyName,
                    postal_code: minimalCompanyInfo.postalCode,
                    address: minimalCompanyInfo.address1,
                    speech_settings: minimalCompanyInfo.speechSettings ? {
                        ai_prompt_enhancement: minimalCompanyInfo.speechSettings.aiPromptEnhancement ? {
                            enabled: minimalCompanyInfo.speechSettings.aiPromptEnhancement.enabled,
                            custom_prompt_instructions: minimalCompanyInfo.speechSettings.aiPromptEnhancement.customPromptInstructions,
                            context_aware_homophone_correction: minimalCompanyInfo.speechSettings.aiPromptEnhancement.contextAwareHomophoneCorrection,
                            business_context_instructions: minimalCompanyInfo.speechSettings.aiPromptEnhancement.businessContextInstructions,
                        } : undefined,
                        dictionary_correction: minimalCompanyInfo.speechSettings.dictionaryCorrection ? {
                            enabled: minimalCompanyInfo.speechSettings.dictionaryCorrection.enabled,
                            custom_dictionary: minimalCompanyInfo.speechSettings.dictionaryCorrection.customDictionary,
                        } : undefined,
                    } : null,
                };
                return server_1.NextResponse.json({
                    success: true,
                    company_info: formattedInfo,
                    message: '音声認識設定を保存しました（会社情報も初期化されました）',
                });
            }
        }
        // デバッグログ
        console.log('PUT request body:', {
            ...body,
            logo_image: body.logo_image ? '[BASE64_IMAGE]' : null,
            stamp_image: body.stamp_image ? '[BASE64_IMAGE]' : null,
        });
        // 会社情報を更新または作成
        let updateData;
        if (isSpeechSettingsOnly) {
            // 音声認識設定のみの更新
            updateData = {
                speechSettings: body.speech_settings ? {
                    aiPromptEnhancement: body.speech_settings.ai_prompt_enhancement ? {
                        enabled: body.speech_settings.ai_prompt_enhancement.enabled ?? true,
                        customPromptInstructions: body.speech_settings.ai_prompt_enhancement.custom_prompt_instructions || null,
                        contextAwareHomophoneCorrection: body.speech_settings.ai_prompt_enhancement.context_aware_homophone_correction ?? true,
                        businessContextInstructions: body.speech_settings.ai_prompt_enhancement.business_context_instructions || null,
                    } : undefined,
                    dictionaryCorrection: body.speech_settings.dictionary_correction ? {
                        enabled: body.speech_settings.dictionary_correction.enabled ?? true,
                        customDictionary: body.speech_settings.dictionary_correction.custom_dictionary || [],
                    } : undefined,
                } : null,
            };
        }
        else {
            // 通常の会社情報更新
            updateData = {
                companyName: body.name,
                postalCode: body.postal_code,
                // addressは単一フィールドとして保存（後で分割処理を実装可能）
                address1: body.address,
                prefecture: '', // 必要に応じて住所から抽出
                city: '', // 必要に応じて住所から抽出
                address2: '', // 必要に応じて追加
                phone: body.phone_number || null,
                fax: body.fax_number || null,
                email: body.email || null,
                registrationNumber: body.tax_number || null,
                invoiceNumberFormat: body.invoice_prefix || null,
                representative: body.representative || null,
                website: body.website || null,
                fiscalYearEnd: body.fiscal_year_end || null,
                establishedDate: body.established_date || null,
                capital: body.capital ? Number(body.capital) : null,
                invoicePrefix: body.invoice_prefix || null,
                paymentTerms: body.payment_terms || null,
                invoiceNotes: body.invoice_notes || null,
                logoImage: body.logo_image || null,
                stampImage: body.stamp_image || null,
                quoteValidityDays: body.quote_validity_days ? Number(body.quote_validity_days) : 30,
                speechSettings: body.speech_settings ? {
                    aiPromptEnhancement: body.speech_settings.ai_prompt_enhancement ? {
                        enabled: body.speech_settings.ai_prompt_enhancement.enabled ?? true,
                        customPromptInstructions: body.speech_settings.ai_prompt_enhancement.custom_prompt_instructions || null,
                        contextAwareHomophoneCorrection: body.speech_settings.ai_prompt_enhancement.context_aware_homophone_correction ?? true,
                        businessContextInstructions: body.speech_settings.ai_prompt_enhancement.business_context_instructions || null,
                    } : undefined,
                    dictionaryCorrection: body.speech_settings.dictionary_correction ? {
                        enabled: body.speech_settings.dictionary_correction.enabled ?? true,
                        customDictionary: body.speech_settings.dictionary_correction.custom_dictionary || [],
                    } : undefined,
                } : null,
            };
        }
        console.log('Prepared update data:', {
            ...updateData,
            logoImage: updateData.logoImage ? '[BASE64_IMAGE]' : null,
            stampImage: updateData.stampImage ? '[BASE64_IMAGE]' : null,
        });
        const companyInfo = isSpeechSettingsOnly
            ? await companyInfoService.updateCompanyInfo(updateData)
            : await companyInfoService.upsertCompanyInfo(updateData);
        if (!companyInfo) {
            return server_1.NextResponse.json({
                success: false,
                error: '会社情報が見つかりません',
            }, { status: 404 });
        }
        // フロントエンドが期待する形式に変換
        const formattedInfo = {
            ...companyInfo,
            name: companyInfo.companyName,
            postal_code: companyInfo.postalCode,
            address: companyInfo.address1 || `${companyInfo.prefecture || ''} ${companyInfo.city || ''} ${companyInfo.address1 || ''}`.trim() || '',
            phone_number: companyInfo.phone,
            fax_number: companyInfo.fax,
            email: companyInfo.email,
            tax_number: companyInfo.registrationNumber,
            invoice_prefix: companyInfo.invoicePrefix || companyInfo.invoiceNumberFormat,
            representative: companyInfo.representative,
            website: companyInfo.website,
            fiscal_year_end: companyInfo.fiscalYearEnd,
            established_date: companyInfo.establishedDate,
            capital: companyInfo.capital,
            payment_terms: companyInfo.paymentTerms,
            invoice_notes: companyInfo.invoiceNotes,
            logo_image: companyInfo.logoImage,
            stamp_image: companyInfo.stampImage,
            speech_settings: companyInfo.speechSettings ? {
                ai_prompt_enhancement: companyInfo.speechSettings.aiPromptEnhancement ? {
                    enabled: companyInfo.speechSettings.aiPromptEnhancement.enabled,
                    custom_prompt_instructions: companyInfo.speechSettings.aiPromptEnhancement.customPromptInstructions,
                    context_aware_homophone_correction: companyInfo.speechSettings.aiPromptEnhancement.contextAwareHomophoneCorrection,
                    business_context_instructions: companyInfo.speechSettings.aiPromptEnhancement.businessContextInstructions,
                } : undefined,
                dictionary_correction: companyInfo.speechSettings.dictionaryCorrection ? {
                    enabled: companyInfo.speechSettings.dictionaryCorrection.enabled,
                    custom_dictionary: companyInfo.speechSettings.dictionaryCorrection.customDictionary,
                } : undefined,
            } : null,
        };
        return server_1.NextResponse.json({
            success: true,
            company_info: formattedInfo,
            message: '会社情報を更新しました',
        });
    }
    catch (error) {
        console.error('Error updating company info:', error);
        return server_1.NextResponse.json({
            success: false,
            error: '会社情報の更新に失敗しました',
        }, { status: 500 });
    }
}
