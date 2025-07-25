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
        // バリデーション
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
        // デバッグログ
        console.log('PUT request body:', {
            ...body,
            logo_image: body.logo_image ? '[BASE64_IMAGE]' : null,
            stamp_image: body.stamp_image ? '[BASE64_IMAGE]' : null,
        });
        // 会社情報を更新または作成
        const updateData = {
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
        };
        console.log('Prepared update data:', {
            ...updateData,
            logoImage: updateData.logoImage ? '[BASE64_IMAGE]' : null,
            stampImage: updateData.stampImage ? '[BASE64_IMAGE]' : null,
        });
        const companyInfo = await companyInfoService.upsertCompanyInfo(updateData);
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
