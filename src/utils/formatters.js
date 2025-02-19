export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  export const getAmountColorClass = (amount) => {
    if (amount >= 100000) return 'bg-green-200';
    if (amount >= 3000) return 'bg-yellow-200';
    return 'bg-white';
  };