export type Item = {
  id: string;
  name: string;
  emoji: string;
  total: number;
  note: string;
  consumable?: boolean;
  dueDays?: number; // 대여 기간 (일). 미설정 시 제한 없음
};

export type Rental = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  studentId: string;
  studentName: string;
  phone: string; // 대여자 전화번호
  uid: string; // 대여자 Firebase UID
  rentedAt: string;
  dueDate: string | null; // 반납 기한 (ISO, KST 기준 해당일 23:59:59). 기간 미설정 물품은 null
  rentPhoto: string; // Firebase Storage URL (관리자 프록시로만 열람)
  returnedAt: string | null;
  returnPhoto: string | null;
  returnedBy?: "self" | "admin";
  overdueNotifiedOn?: string; // 마지막 연체 알림 발송일 (KST YYYY-MM-DD)
};

export type RentalProfile = Pick<Rental, "studentName" | "studentId" | "phone">;

/** 학생 본인에게 내려주는 대여 정보 (타인 개인정보 없음) */
export type MyRental = Pick<
  Rental,
  "id" | "itemId" | "itemName" | "quantity" | "rentedAt" | "dueDate" | "uid"
> &
  Partial<Pick<Rental, "studentName" | "studentId" | "phone">>;

export type ItemWithStock = Item & {
  rented: number;
  remaining: number;
};

// 창고(비축 재고) — 재고와 독립된 별도 물품 목록. 대여 없이 수량만 관리
export type StorageItem = {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
  note: string;
  updatedAt: string;
};
