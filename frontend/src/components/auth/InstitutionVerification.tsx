// /frontend/src/components/auth/InstitutionVerification.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function InstitutionVerification() {
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    institutionEmail: string | null;
    verified: boolean;
    verifiedAt: string | null;
  } | null>(null);

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch('/api/users/institution/status');
      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }
      const data = await response.json();
      setVerificationStatus(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch status on component mount - FIXED: useEffect instead of useState
  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const handleSendCode = async () => {
    if (!institutionEmail.toLowerCase().endsWith('.edu')) {
      toast.error('Please enter a valid .edu email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/institution/verify-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ institutionEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to send verification code');
      }

      setIsCodeSent(true);
      toast.success('Verification code sent to your institution email');
    } catch (error) {
      toast.error('Failed to send verification code');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/institution/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      toast.success('Institution email verified successfully');
      await fetchVerificationStatus();
    } catch (error) {
      toast.error('Invalid verification code');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationStatus?.verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Institution Verification</CardTitle>
          <CardDescription>Your institution email has been verified.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 bg-green-50 p-4 rounded-md border border-green-200">
            <div className="text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="text-green-800">
              <div className="font-medium">Verified</div>
              <div className="text-sm">{verificationStatus.institutionEmail}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Institution Verification</CardTitle>
        <CardDescription>
          Verify your academic institution email address to access additional features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isCodeSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="institutionEmail">Institution Email (.edu)</Label>
              <Input
                id="institutionEmail"
                type="email"
                placeholder="you@university.edu"
                value={institutionEmail}
                onChange={(e) => setInstitutionEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSendCode}
              disabled={isLoading || !institutionEmail}
            >
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                We've sent a verification code to {institutionEmail}.
                Please check your inbox and enter the code above.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCodeSent(false)}
                disabled={isLoading}
              >
                Change Email
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}