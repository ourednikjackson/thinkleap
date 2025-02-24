// /frontend/src/app/dashboard/verify-institution/page.tsx
import { InstitutionVerification } from '@/components/auth/InstitutionVerification';

export default function VerifyInstitutionPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Institution Verification</h1>
      <div className="max-w-md">
        <InstitutionVerification />
      </div>
    </div>
  );
}