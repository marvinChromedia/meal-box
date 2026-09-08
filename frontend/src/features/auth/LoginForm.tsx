import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { ApiClientError } from '../../lib/api/http.ts';
import { useSignIn } from './hooks.ts';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signInMutation = useSignIn();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    signInMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate('/');
        },
      },
    );
  }

  const errorMessage =
    signInMutation.error instanceof ApiClientError
      ? signInMutation.error.message
      : signInMutation.isError
        ? 'something went wrong, please try again'
        : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {errorMessage ? (
        <Alert variant="danger" role="alert">
          {errorMessage}
        </Alert>
      ) : null}

      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button type="submit" disabled={signInMutation.isPending} className="w-full sm:w-auto">
        {signInMutation.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
