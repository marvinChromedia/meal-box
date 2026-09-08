import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button.tsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.tsx';
import { useCurrentUser, useSignOut } from './hooks.ts';

export function AccountPage() {
  const { data: user } = useCurrentUser();
  const signOutMutation = useSignOut();
  const navigate = useNavigate();

  function handleSignOut() {
    signOutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/login', { state: { justSignedOut: true } });
      },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-8">
      <Card>
        <CardHeader>Your account</CardHeader>
        <CardBody className="flex flex-col gap-4">
          <p className="text-gray-700">
            Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
          </p>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
            className="w-full sm:w-auto"
          >
            {signOutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </CardBody>
      </Card>
    </main>
  );
}
