declare function processData(d: any): any[];
declare function handleUserRequest(req: any): {
    id: any;
    status: string;
} | null;
declare function sendEmail(userId: any, message: any): void;
