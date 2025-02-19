'use client';

export default function MonthPage({ params }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gray-800 p-6 rounded-lg text-white">
        <h1 className="text-3xl font-bold mb-4">Monthly View - Coming Soon</h1>
        <p className="text-xl">
          Detailed view for month: {params.month}
        </p>
        <div className="mt-4 p-4 bg-gray-700 rounded">
          <p>Features planned:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Detailed monthly transaction breakdown</li>
            <li>Monthly statistics and analytics</li>
            <li>Category-wise expense distribution</li>
            <li>Payment method analysis</li>
            <li>Comparison with previous months</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
