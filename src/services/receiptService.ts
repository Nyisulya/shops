import type { Sale, LaundryOrder, WakalaTransaction, Branch } from '../types';

export const formatCurrency = (amount: number): string => {
  return 'TZS ' + amount.toLocaleString('en-US');
};

export const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('sw-TZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

// Generate WhatsApp direct chat URL with custom business message
export const generateWhatsAppLink = (phone: string, text: string): string => {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '255' + cleaned.substring(1);
  } else if (!cleaned.startsWith('255')) {
    cleaned = '255' + cleaned;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
};

export const generateLaundryNotificationMessage = (order: LaundryOrder, branchName: string): string => {
  const balanceText = order.balanceDue > 0 ? `Baki ya kulipa: ${formatCurrency(order.balanceDue)}.` : 'Malipo: Yamelipwa yote (PAID).';
  return `Habari ndugu ${order.customerName},\n\nNguo zako (Tag: *${order.tagNumber}*) zipo *TAYARI* kuchukuliwa katika ofisi yetu ya *${branchName}*.\n\nJumla ya nguo: ${order.items.reduce((s, i) => s + i.quantity, 0)} pcs.\n${balanceText}\n\nKaribu sana tukuhudumie tena!`;
};
