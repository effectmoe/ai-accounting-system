export declare const createCustomerTool: {
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
};
export declare const updateCustomerTool: {
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
};
export declare const searchCustomersTool: {
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
};
export declare const analyzeCustomerTool: {
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
};
export declare const calculateCustomerLifetimeValueTool: {
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
};
export declare const generateCustomerReportTool: {
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
export declare const customerTools: ({
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
