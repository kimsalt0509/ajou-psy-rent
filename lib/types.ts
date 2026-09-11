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
  phone: string;        // 대여자 전화번호
  uid: string;          // 대여자 Firebase UID
  rentedAt: string;
  dueDate: string | null; // 반납 기한 (ISO). 기간 미설정 물품은 null
  rentPhoto: string;    // Firebase Storage 공개 URL
  returnedAt: string | null;
  returnPhoto: string | null; // Firebase Storage 공개 URL
};

export type ItemWithStock = Item & {
  rented: number;
  remaining: number;
};

// 창고(비축 재고) — 물품별로 창고에 보관 중인 수량
export type StorageItem = {
  id: string;       // itemId와 동일
  itemId: string;
  itemName: string;
  emoji: string;
  quantity: number; // 창고에 남은 수량
  updatedAt: string;
};
