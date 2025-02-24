// /frontend/src/app/auth/reset-password/[token]/page.tsx
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <ResetPasswordForm token={params.token} />
    </div>
</div>
);
}