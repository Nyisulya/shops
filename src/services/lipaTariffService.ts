export interface LipaTariffTier {
  minAmount: number;
  maxAmount: number;
  rangeLabel: string;
  lipaCharge: number;      // Makato ya Lipa (Voda, Airtel, Tigo, Halotel)
  agentWithdrawCharge: number | null; // Makato Kutoa kwa Wakala (Kawaida)
  wakalaTakes: number;     // Wakala Anachukua (Ada anayochukua Wakala kutoka kwa mteja)
}

// 26 Tiers as given in the official tariff chart image
export const LIPA_TARIFF_TABLE: LipaTariffTier[] = [
  { minAmount: 501, maxAmount: 999, rangeLabel: '501 - 999', lipaCharge: 20, agentWithdrawCharge: null, wakalaTakes: 100 },
  { minAmount: 1000, maxAmount: 1999, rangeLabel: '1,000 - 1,999', lipaCharge: 50, agentWithdrawCharge: 310, wakalaTakes: 100 },
  { minAmount: 2000, maxAmount: 2999, rangeLabel: '2,000 - 2,999', lipaCharge: 70, agentWithdrawCharge: 410, wakalaTakes: 200 },
  { minAmount: 3000, maxAmount: 3999, rangeLabel: '3,000 - 3,999', lipaCharge: 100, agentWithdrawCharge: 614, wakalaTakes: 200 },
  { minAmount: 4000, maxAmount: 4999, rangeLabel: '4,000 - 4,999', lipaCharge: 200, agentWithdrawCharge: 627, wakalaTakes: 300 },
  { minAmount: 5000, maxAmount: 5999, rangeLabel: '5,000 - 5,999', lipaCharge: 300, agentWithdrawCharge: 1004, wakalaTakes: 300 },
  { minAmount: 6000, maxAmount: 6999, rangeLabel: '6,000 - 6,999', lipaCharge: 300, agentWithdrawCharge: 1004, wakalaTakes: 400 },
  { minAmount: 7000, maxAmount: 7999, rangeLabel: '7,000 - 7,999', lipaCharge: 500, agentWithdrawCharge: 1056, wakalaTakes: 400 },
  { minAmount: 8000, maxAmount: 8999, rangeLabel: '8,000 - 8,999', lipaCharge: 500, agentWithdrawCharge: 1056, wakalaTakes: 400 },
  { minAmount: 9000, maxAmount: 9999, rangeLabel: '9,000 - 9,999', lipaCharge: 500, agentWithdrawCharge: 1056, wakalaTakes: 400 },
  { minAmount: 10000, maxAmount: 14999, rangeLabel: '10,000 - 14,999', lipaCharge: 700, agentWithdrawCharge: 1552, wakalaTakes: 500 },
  { minAmount: 15000, maxAmount: 19999, rangeLabel: '15,000 - 19,999', lipaCharge: 850, agentWithdrawCharge: 1645, wakalaTakes: 500 },
  { minAmount: 20000, maxAmount: 29999, rangeLabel: '20,000 - 29,999', lipaCharge: 920, agentWithdrawCharge: 2156, wakalaTakes: 500 },
  { minAmount: 30000, maxAmount: 39999, rangeLabel: '30,000 - 39,999', lipaCharge: 1000, agentWithdrawCharge: 2201, wakalaTakes: 700 },
  { minAmount: 40000, maxAmount: 49999, rangeLabel: '40,000 - 49,999', lipaCharge: 1200, agentWithdrawCharge: 2769, wakalaTakes: 1000 },
  { minAmount: 50000, maxAmount: 99999, rangeLabel: '50,000 - 99,999', lipaCharge: 1700, agentWithdrawCharge: 3273, wakalaTakes: 1000 },
  { minAmount: 100000, maxAmount: 199999, rangeLabel: '100,000 - 199,999', lipaCharge: 2000, agentWithdrawCharge: 4357, wakalaTakes: 1500 },
  { minAmount: 200000, maxAmount: 299999, rangeLabel: '200,000 - 299,999', lipaCharge: 2600, agentWithdrawCharge: 6121, wakalaTakes: 1500 },
  { minAmount: 300000, maxAmount: 399999, rangeLabel: '300,000 - 399,999', lipaCharge: 3000, agentWithdrawCharge: 7338, wakalaTakes: 2000 },
  { minAmount: 400000, maxAmount: 499999, rangeLabel: '400,000 - 499,999', lipaCharge: 3500, agentWithdrawCharge: 7982, wakalaTakes: 2000 },
  { minAmount: 500000, maxAmount: 599999, rangeLabel: '500,000 - 599,999', lipaCharge: 4500, agentWithdrawCharge: 8745, wakalaTakes: 2500 },
  { minAmount: 600000, maxAmount: 699999, rangeLabel: '600,000 - 699,999', lipaCharge: 5500, agentWithdrawCharge: 9532, wakalaTakes: 2500 },
  { minAmount: 700000, maxAmount: 799999, rangeLabel: '700,000 - 799,999', lipaCharge: 5700, agentWithdrawCharge: 9700, wakalaTakes: 2500 },
  { minAmount: 800000, maxAmount: 899999, rangeLabel: '800,000 - 899,999', lipaCharge: 6000, agentWithdrawCharge: 9750, wakalaTakes: 3000 },
  { minAmount: 900000, maxAmount: 999999, rangeLabel: '900,000 - 999,999', lipaCharge: 6000, agentWithdrawCharge: 9776, wakalaTakes: 3000 },
  { minAmount: 1000000, maxAmount: 3000000, rangeLabel: '1,000,000 - 3,000,000', lipaCharge: 6000, agentWithdrawCharge: 9875, wakalaTakes: 3000 }
];

export const findLipaTariff = (amount: number): LipaTariffTier | null => {
  if (!amount || amount < 500) return null;
  const match = LIPA_TARIFF_TABLE.find(t => amount >= t.minAmount && amount <= t.maxAmount);
  if (match) return match;
  // If above 3,000,000 cap at highest tier
  if (amount > 3000000) {
    return LIPA_TARIFF_TABLE[LIPA_TARIFF_TABLE.length - 1];
  }
  return null;
};

export interface LipaFromBalanceResult {
  totalPhoneBalance: number;
  amountToSend: number;      // Kiasi mteja anachotuma kwa Lipa Namba
  lipaCharge: number;        // Makato ya mtandao (Voda/Tigo/etc) kwenye simu ya mteja
  wakalaTakes: number;       // Ada ya Wakala (Faida ya Wakala)
  cashToCustomer: number;    // Pesa taslimu (Cash) ya kumpa mteja mkononi
  tier: LipaTariffTier;
}

/**
 * Kokotoa kiotomatiki pale mteja anapokuja na salio lake la simuni (mfano ana 5,000 simuni)
 * na anataka itoke yote bila simu kukataa kwa sababu ya 'Salio halitoshi'.
 */
export const calculateLipaFromPhoneBalance = (
  totalBalance: number,
  customFee?: number | ''
): LipaFromBalanceResult | null => {
  if (!totalBalance || totalBalance < 521) return null;

  // Kama salio linazidi 3,000,000
  if (totalBalance > 3000000) {
    const highestTier = LIPA_TARIFF_TABLE[LIPA_TARIFF_TABLE.length - 1];
    const send = totalBalance - highestTier.lipaCharge;
    const fee = (customFee !== undefined && customFee !== '' && !isNaN(Number(customFee)))
      ? Number(customFee)
      : highestTier.wakalaTakes;
    return {
      totalPhoneBalance: totalBalance,
      amountToSend: send,
      lipaCharge: highestTier.lipaCharge,
      wakalaTakes: fee,
      cashToCustomer: Math.max(0, send - fee),
      tier: highestTier
    };
  }

  // Tafuta tier kuanzia juu kwenda chini
  for (let i = LIPA_TARIFF_TABLE.length - 1; i >= 0; i--) {
    const tier = LIPA_TARIFF_TABLE[i];
    let possibleSend = totalBalance - tier.lipaCharge;

    if (possibleSend >= tier.minAmount) {
      if (possibleSend > tier.maxAmount) {
        possibleSend = tier.maxAmount;
      }

      if (
        possibleSend >= tier.minAmount &&
        possibleSend <= tier.maxAmount &&
        possibleSend + tier.lipaCharge <= totalBalance
      ) {
        const fee = (customFee !== undefined && customFee !== '' && !isNaN(Number(customFee)))
          ? Number(customFee)
          : tier.wakalaTakes;

        return {
          totalPhoneBalance: totalBalance,
          amountToSend: possibleSend,
          lipaCharge: tier.lipaCharge,
          wakalaTakes: fee,
          cashToCustomer: Math.max(0, possibleSend - fee),
          tier
        };
      }
    }
  }

  return null;
};

