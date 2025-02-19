'use client';

import { useState } from 'react';
import { format, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import Link from 'next/link';
import { formatCurrency, getAmountColorClass } from '@/utils/formatters';

export default function Calendar({ transactions }) {
  const [year] = useState(new Date().getFullYear());
  
  const days = eachDayOfInterval({
    start: startOfYear(new Date(year, 0, 1)),
    end: endOfYear(new Date(year, 11, 31))
  });

  const getDayTotal = (date) => {
    const dayTransactions = transactions.filter(t => 
      format(new Date(t.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    return dayTransactions.reduce((acc, curr) => 
      acc + (curr.income ? curr.amount : -curr.amount), 0
    );
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(day => {
        const total = getDayTotal(day);
        const colorClass = getAmountColorClass(total);
        
        return (
          <Link 
            key={day.toString()}
            href={`/month/${format(day, 'MM')}`}
            className={`p-4 border rounded ${colorClass} hover:shadow-md transition-shadow`}
          >
            <div className="text-sm">{format(day, 'MMM d')}</div>
            <div className="font-bold">{formatCurrency(total)}</div>
          </Link>
        );
      })}
    </div>
  );
}