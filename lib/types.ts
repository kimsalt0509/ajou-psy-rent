export type Item = {
  id: string;
  name: string;
  emoji: string;
  total: number;
  note: string;
  consumable?: boolean;
};

export type Rental = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  studentId: string;
  studentName: string;
  rentedAt: string;
  rentPhoto: string;    // Firebase Storage 공개 URL
  returnedAt: string | null;
  returnPhoto: string | null; // Firebase Storage 공개 URL
};

export type ItemWithStock = Item & {
  rented: number;
  remaining: number;
};
