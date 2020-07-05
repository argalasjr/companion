export interface BasUser {
        uid: number;
        bas_UserID: string;
        bas_FirstName: string;
        bas_LastName: string;
        ext_Image: string;
        acc_Level: number;
        acc_Role: string;
        acc_ValidFrom: string;
        acc_ValidUntil: string;
        acc_HasPinCode: boolean;
        att_Status: number;
        bio_Count: number;
        bio_Critical: boolean;
}

