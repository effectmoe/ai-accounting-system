export declare const categorizeTransactionTool: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            description: {
                type: string;
                description: string;
            };
            amount: {
                type: string;
                description: string;
            };
            vendor_name: {
                type: string;
                description: string;
            };
            transaction_type: {
                type: string;
                enum: string[];
                description: string;
            };
            date: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        category: string;
        accountCode: string;
        description: any;
        amount: any;
        vendor_name: any;
        transaction_type: any;
        date: any;
        confidence: number;
        reasoning: string;
    }>;
};
export declare const createJournalEntryTool: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            description: {
                type: string;
                description: string;
            };
            amount: {
                type: string;
                description: string;
            };
            debit_account: {
                type: string;
                description: string;
            };
            credit_account: {
                type: string;
                description: string;
            };
            date: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        description: any;
        amount: any;
        debit_account: any;
        credit_account: any;
        date: Date;
        company_id: any;
        created_at: Date;
        updated_at: Date;
        status: string;
        entry_number: string;
        success: boolean;
        id: string;
    }>;
};
export declare const createInvoiceTool: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            customer_name: {
                type: string;
                description: string;
            };
            items: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        description: {
                            type: string;
                            description: string;
                        };
                        quantity: {
                            type: string;
                            description: string;
                        };
                        unit_price: {
                            type: string;
                            description: string;
                        };
                    };
                };
            };
            tax_rate: {
                type: string;
                description: string;
            };
            due_date: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        invoice: import("../../../types/collections").Invoice;
        message: string;
    }>;
};
export declare const generateFinancialReportTool: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            report_type: {
                type: string;
                enum: string[];
                description: string;
            };
            start_date: {
                type: string;
                description: string;
            };
            end_date: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        report_id: string;
        report: any;
    }>;
};
export declare const calculateTaxTool: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            tax_type: {
                type: string;
                enum: string[];
                description: string;
            };
            taxable_amount: {
                type: string;
                description: string;
            };
            tax_rate: {
                type: string;
                description: string;
            };
            company_type: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        tax_type: any;
        calculation: any;
        summary: {
            taxable_amount: any;
            tax_amount: number;
            effective_rate: string;
            calculated_at: string;
        };
    }>;
};
export declare const analyzeExpensesTool: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            period_start: {
                type: string;
                description: string;
            };
            period_end: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
            analysis_type: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        analysis: any;
        generated_at: string;
    }>;
};
export declare const accountingTools: ({
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            description: {
                type: string;
                description: string;
            };
            amount: {
                type: string;
                description: string;
            };
            vendor_name: {
                type: string;
                description: string;
            };
            transaction_type: {
                type: string;
                enum: string[];
                description: string;
            };
            date: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        category: string;
        accountCode: string;
        description: any;
        amount: any;
        vendor_name: any;
        transaction_type: any;
        date: any;
        confidence: number;
        reasoning: string;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            description: {
                type: string;
                description: string;
            };
            amount: {
                type: string;
                description: string;
            };
            debit_account: {
                type: string;
                description: string;
            };
            credit_account: {
                type: string;
                description: string;
            };
            date: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        description: any;
        amount: any;
        debit_account: any;
        credit_account: any;
        date: Date;
        company_id: any;
        created_at: Date;
        updated_at: Date;
        status: string;
        entry_number: string;
        success: boolean;
        id: string;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            customer_name: {
                type: string;
                description: string;
            };
            items: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        description: {
                            type: string;
                            description: string;
                        };
                        quantity: {
                            type: string;
                            description: string;
                        };
                        unit_price: {
                            type: string;
                            description: string;
                        };
                    };
                };
            };
            tax_rate: {
                type: string;
                description: string;
            };
            due_date: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        invoice: import("../../../types/collections").Invoice;
        message: string;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            report_type: {
                type: string;
                enum: string[];
                description: string;
            };
            start_date: {
                type: string;
                description: string;
            };
            end_date: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        report_id: string;
        report: any;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            tax_type: {
                type: string;
                enum: string[];
                description: string;
            };
            taxable_amount: {
                type: string;
                description: string;
            };
            tax_rate: {
                type: string;
                description: string;
            };
            company_type: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        tax_type: any;
        calculation: any;
        summary: {
            taxable_amount: any;
            tax_amount: number;
            effective_rate: string;
            calculated_at: string;
        };
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            period_start: {
                type: string;
                description: string;
            };
            period_end: {
                type: string;
                description: string;
            };
            company_id: {
                type: string;
                description: string;
            };
            analysis_type: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        analysis: any;
        generated_at: string;
    }>;
})[];
