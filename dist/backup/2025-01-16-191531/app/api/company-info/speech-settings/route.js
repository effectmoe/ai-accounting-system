"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
const server_1 = require("next/server");
const company_info_service_1 = require("@/services/company-info.service");
// PUT: 音声認識設定のみを更新
async function PUT(request) {
    try {
        const body = await request.json();
        const companyInfoService = new company_info_service_1.CompanyInfoService();
        // 音声認識設定のバリデーション
        if (!body.speech_settings) {
            return server_1.NextResponse.json({
                success: false,
                error: 'speech_settingsが必要です',
            }, { status: 400 });
        }
        // 既存の会社情報を取得
        const existingInfo = await companyInfoService.getCompanyInfo();
        if (!existingInfo) {
            return server_1.NextResponse.json({
                success: false,
                error: '会社情報が見つかりません。先に会社情報を登録してください。',
            }, { status: 404 });
        }
        // 音声認識設定のみを更新
        const updateData = {
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
        console.log('Updating speech settings:', updateData);
        const updatedInfo = await companyInfoService.updateCompanyInfo(updateData);
        if (!updatedInfo) {
            return server_1.NextResponse.json({
                success: false,
                error: '音声認識設定の更新に失敗しました',
            }, { status: 500 });
        }
        // フロントエンドが期待する形式に変換
        const formattedSpeechSettings = updatedInfo.speechSettings ? {
            ai_prompt_enhancement: updatedInfo.speechSettings.aiPromptEnhancement ? {
                enabled: updatedInfo.speechSettings.aiPromptEnhancement.enabled,
                custom_prompt_instructions: updatedInfo.speechSettings.aiPromptEnhancement.customPromptInstructions,
                context_aware_homophone_correction: updatedInfo.speechSettings.aiPromptEnhancement.contextAwareHomophoneCorrection,
                business_context_instructions: updatedInfo.speechSettings.aiPromptEnhancement.businessContextInstructions,
            } : undefined,
            dictionary_correction: updatedInfo.speechSettings.dictionaryCorrection ? {
                enabled: updatedInfo.speechSettings.dictionaryCorrection.enabled,
                custom_dictionary: updatedInfo.speechSettings.dictionaryCorrection.customDictionary,
            } : undefined,
        } : null;
        return server_1.NextResponse.json({
            success: true,
            speech_settings: formattedSpeechSettings,
            message: '音声認識設定を更新しました',
        });
    }
    catch (error) {
        console.error('Error updating speech settings:', error);
        return server_1.NextResponse.json({
            success: false,
            error: '音声認識設定の更新に失敗しました',
        }, { status: 500 });
    }
}
