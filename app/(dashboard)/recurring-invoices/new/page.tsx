'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid,
  Container
} from '@mui/material';
import { 
  SmartToy as AIIcon,
  Edit as FormIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import RecurringInvoiceForm from '@/components/recurring-invoices/RecurringInvoiceForm';
import AIChatDialog from '@/components/ai-chat-dialog';

export default function NewRecurringInvoicePage() {
  const [creationMode, setCreationMode] = useState<'select' | 'ai' | 'form'>('select');
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (creationMode === 'form') {
    return <RecurringInvoiceForm />;
  }

  if (creationMode === 'ai') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => setCreationMode('select')}
              sx={{ mb: 2 }}
            >
              ← 戻る
            </Button>
          </Box>
          <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
            AIアシスタントで定期請求書作成
          </Typography>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <AIChatDialog 
                mode="create"
                documentType="invoice"
                onClose={() => setCreationMode('select')}
                isOpen={true}
              />
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
          定期請求書作成
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 6 }}>
          作成方法を選択してください
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={5}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => setCreationMode('ai')}
            >
              <CardContent sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ mb: 3 }}>
                  <AIIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  AIアシスタントで作成
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  会話形式で簡単に請求書を作成。顧客名、金額、内容を伝えるだけ。
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
                    開始する
                  </Typography>
                  <ArrowIcon color="primary" fontSize="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => setCreationMode('form')}
            >
              <CardContent sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ mb: 3 }}>
                  <FormIcon sx={{ fontSize: 64, color: 'secondary.main' }} />
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  フォームで手動作成
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  下のフォームに直接入力。詳細な設定が可能です。
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 'medium' }}>
                    選択中
                  </Typography>
                  <ArrowIcon color="secondary" fontSize="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}