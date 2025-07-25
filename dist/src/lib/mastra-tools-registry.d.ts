export declare const toolsRegistry: {
    accountingAgent: ({
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
            invoice: import("../../types/collections").Invoice;
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
    customerAgent: ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                name: {
                    type: string;
                    description: string;
                };
                name_kana: {
                    type: string;
                    description: string;
                };
                email: {
                    type: string;
                    description: string;
                };
                phone: {
                    type: string;
                    description: string;
                };
                address: {
                    type: string;
                    description: string;
                };
                tax_id: {
                    type: string;
                    description: string;
                };
                payment_terms: {
                    type: string;
                    description: string;
                };
                credit_limit: {
                    type: string;
                    description: string;
                };
                notes: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (params: any) => Promise<{
            customerId: string;
            companyName: any;
            companyNameKana: any;
            email: any;
            phone: any;
            fax: string;
            taxId: any;
            postalCode: string;
            prefecture: any;
            city: any;
            address1: any;
            address2: string;
            website: string;
            paymentTerms: any;
            creditLimit: any;
            notes: any;
            tags: never[];
            contacts: never[];
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            success: boolean;
            customer_id: string;
            customer_code: string;
        }>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                customer_id: {
                    type: string;
                    description: string;
                };
                updates: {
                    type: string;
                    description: string;
                    properties: {
                        name: {
                            type: string;
                            description: string;
                        };
                        email: {
                            type: string;
                            description: string;
                        };
                        phone: {
                            type: string;
                            description: string;
                        };
                        address: {
                            type: string;
                            description: string;
                        };
                        credit_limit: {
                            type: string;
                            description: string;
                        };
                        status: {
                            type: string;
                            enum: string[];
                            description: string;
                        };
                    };
                };
            };
            required: string[];
        };
        handler: (params: any) => Promise<{
            success: boolean;
            customer_id: any;
            updated_fields: string[];
            updated_at: any;
        }>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                query: {
                    type: string;
                    description: string;
                };
                filters: {
                    type: string;
                    description: string;
                    properties: {
                        status: {
                            type: string;
                            enum: string[];
                            description: string;
                        };
                        min_revenue: {
                            type: string;
                            description: string;
                        };
                        max_revenue: {
                            type: string;
                            description: string;
                        };
                        created_after: {
                            type: string;
                            description: string;
                        };
                        created_before: {
                            type: string;
                            description: string;
                        };
                    };
                };
                sort_by: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                limit: {
                    type: string;
                    description: string;
                };
            };
            required: never[];
        };
        handler: (params: any) => Promise<{
            success: boolean;
            count: number;
            customers: {
                customer_id: any;
                name: any;
                email: any;
                phone: any;
                status: string;
                created_at: any;
            }[];
        }>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                customer_id: {
                    type: string;
                    description: string;
                };
                analysis_type: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                period_start: {
                    type: string;
                    description: string;
                };
                period_end: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (params: any) => Promise<{
            success: boolean;
            analysis: any;
        }>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                customer_id: {
                    type: string;
                    description: string;
                };
                projection_years: {
                    type: string;
                    description: string;
                };
                discount_rate: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (params: any) => Promise<{
            success: boolean;
            customer_id: any;
            customer_name: any;
            calculation: {
                historical_data: {
                    total_revenue: number;
                    years_active: string;
                    annual_revenue: number;
                    transaction_count: number;
                };
                projection: {
                    years: any;
                    discount_rate: string;
                    clv: number;
                    clv_formatted: string;
                };
            };
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
                period_start: {
                    type: string;
                    description: string;
                };
                period_end: {
                    type: string;
                    description: string;
                };
                format: {
                    type: string;
                    enum: string[];
                    description: string;
                };
            };
            required: string[];
        };
        handler: (params: any) => Promise<{
            success: boolean;
            report_id: string;
            report: any;
            format: any;
        }>;
    })[];
    databaseAgent: never[];
    deploymentAgent: never[];
    japanTaxAgent: never[];
    ocrAgent: never[];
    problemSolvingAgent: never[];
    productAgent: never[];
    refactorAgent: never[];
    uiAgent: never[];
    constructionAgent: never[];
};
export declare function getTool(agentName: string, toolName: string): {
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
        invoice: import("../../types/collections").Invoice;
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
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
            };
            name_kana: {
                type: string;
                description: string;
            };
            email: {
                type: string;
                description: string;
            };
            phone: {
                type: string;
                description: string;
            };
            address: {
                type: string;
                description: string;
            };
            tax_id: {
                type: string;
                description: string;
            };
            payment_terms: {
                type: string;
                description: string;
            };
            credit_limit: {
                type: string;
                description: string;
            };
            notes: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        customerId: string;
        companyName: any;
        companyNameKana: any;
        email: any;
        phone: any;
        fax: string;
        taxId: any;
        postalCode: string;
        prefecture: any;
        city: any;
        address1: any;
        address2: string;
        website: string;
        paymentTerms: any;
        creditLimit: any;
        notes: any;
        tags: never[];
        contacts: never[];
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        success: boolean;
        customer_id: string;
        customer_code: string;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            customer_id: {
                type: string;
                description: string;
            };
            updates: {
                type: string;
                description: string;
                properties: {
                    name: {
                        type: string;
                        description: string;
                    };
                    email: {
                        type: string;
                        description: string;
                    };
                    phone: {
                        type: string;
                        description: string;
                    };
                    address: {
                        type: string;
                        description: string;
                    };
                    credit_limit: {
                        type: string;
                        description: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                };
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        customer_id: any;
        updated_fields: string[];
        updated_at: any;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            filters: {
                type: string;
                description: string;
                properties: {
                    status: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    min_revenue: {
                        type: string;
                        description: string;
                    };
                    max_revenue: {
                        type: string;
                        description: string;
                    };
                    created_after: {
                        type: string;
                        description: string;
                    };
                    created_before: {
                        type: string;
                        description: string;
                    };
                };
            };
            sort_by: {
                type: string;
                enum: string[];
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: never[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        count: number;
        customers: {
            customer_id: any;
            name: any;
            email: any;
            phone: any;
            status: string;
            created_at: any;
        }[];
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            customer_id: {
                type: string;
                description: string;
            };
            analysis_type: {
                type: string;
                enum: string[];
                description: string;
            };
            period_start: {
                type: string;
                description: string;
            };
            period_end: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        analysis: any;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            customer_id: {
                type: string;
                description: string;
            };
            projection_years: {
                type: string;
                description: string;
            };
            discount_rate: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        customer_id: any;
        customer_name: any;
        calculation: {
            historical_data: {
                total_revenue: number;
                years_active: string;
                annual_revenue: number;
                transaction_count: number;
            };
            projection: {
                years: any;
                discount_rate: string;
                clv: number;
                clv_formatted: string;
            };
        };
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
            period_start: {
                type: string;
                description: string;
            };
            period_end: {
                type: string;
                description: string;
            };
            format: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
    handler: (params: any) => Promise<{
        success: boolean;
        report_id: string;
        report: any;
        format: any;
    }>;
};
export declare function getAgentTools(agentName: string): {
    name: string;
    description: string;
}[];
