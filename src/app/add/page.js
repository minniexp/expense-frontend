
import AddTransactionForm from '@/components/AddTransactionForm';

export default async function AddTransactionPage() {
  // Verify user has advanced permissions if needed
  // This is already handled by middleware but you could add additional checks
  
  // Render the client component form
  return <AddTransactionForm />;
}
