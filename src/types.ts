export interface Client {
  id: string;
  fullName: string;
  mobile: string;
  normalizedMobile: string;
  gift: "blow-dry" | "beard-fade" | "credit-99k";
  trackingCode: string;
  createdAt: string;
  status: "registered" | "visited" | "reward-claimed";
}

export interface GiftOption {
  id: "blow-dry" | "beard-fade" | "credit-99k";
  title: string;
  description: string;
  iconName: string;
}

export const GIFT_OPTIONS: GiftOption[] = [
  {
    id: "blow-dry",
    title: "سشوار و استایل مو",
    description: "",
    iconName: "Wind",
  },
  {
    id: "beard-fade",
    title: "فید ریش / سایه",
    description: "",
    iconName: "Scissors",
  },
  {
    id: "credit-99k",
    title: "۹۹ هزار تومن اعتبار",
    description: "",
    iconName: "CreditCard",
  },
];

export const FREE_LABEL = "رایگان";

export const STATUS_LABELS = {
  registered: {
    label: "ثبت شده",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  visited: {
    label: "مراجعه کرده",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
  "reward-claimed": {
    label: "هدیه تحویل داده شد",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
};
