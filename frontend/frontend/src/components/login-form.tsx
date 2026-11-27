'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import {
    Bot,
    ShieldCheck,
    LoaderCircle,
    ArrowRight,
    Eye,
    EyeOff,
    Lock,
    CircleAlert,
} from 'lucide-react';

import {
    authenticate,
    getErrorMessage,
} from '@/lib/api';

import type {
    CustomerIdentity,
} from '@/lib/chat.types';

interface LoginFormProps {
    onAuthenticated: (
        token: string,
        customer: CustomerIdentity,
    ) => void;
}

export function LoginForm({
    onAuthenticated,
}: LoginFormProps) {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (loading) return;

        setError('');
        setLoading(true);

        try {
            const credential = token.trim();

            const customer =
                await authenticate(credential);

            onAuthenticated(
                credential,
                customer,
            );

            setToken('');
        } catch (error: unknown) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6">
            <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <Bot size={24} />
                    </div>

                    <div>
                        <h1 className="text-base font-medium leading-tight text-slate-100">
                            Nexus Commerce AI
                        </h1>

                        <p className="text-sm text-slate-400">
                            Assistente de atendimento
                        </p>
                    </div>
                </div>

                <div className="my-6 border-t border-slate-800" />

                <h2 className="text-lg font-medium text-slate-100">
                    Acesse sua conta
                </h2>

                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                    Informe seu token de demonstração para
                    iniciar o atendimento.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6"
                >
                    <label
                        htmlFor="access-token"
                        className="mb-1.5 block text-sm font-medium text-slate-200"
                    >
                        Token de acesso
                    </label>

                    <div className="relative">
                        <Lock
                            size={16}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                            id="access-token"
                            type={visible ? 'text' : 'password'}
                            value={token}
                            onChange={(event) =>
                                setToken(event.target.value)
                            }
                            placeholder="Informe seu token"
                            autoComplete="off"
                            spellCheck={false}
                            maxLength={2048}
                            required
                            disabled={loading}
                            aria-invalid={!!error}
                            aria-describedby={
                                error ? 'token-error' : undefined
                            }
                            className={`h-11 w-full rounded-lg border bg-slate-950 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                                error
                                    ? 'border-red-800 focus:border-red-600 focus:ring-red-600/30'
                                    : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/30'
                            }`}
                        />

                        <button
                            type="button"
                            onClick={() => setVisible((v) => !v)}
                            aria-label={
                                visible
                                    ? 'Ocultar token'
                                    : 'Mostrar token'
                            }
                            aria-pressed={visible}
                            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                        >
                            {visible ? (
                                <EyeOff size={16} />
                            ) : (
                                <Eye size={16} />
                            )}
                        </button>
                    </div>

                    {error && (
                        <p
                            id="token-error"
                            role="alert"
                            className="mt-3 flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300"
                        >
                            <CircleAlert
                                size={16}
                                className="mt-0.5 shrink-0"
                            />
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !token.trim()}
                        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? 'Validando...' : 'Entrar'}

                        {loading ? (
                            <LoaderCircle
                                size={16}
                                className="animate-spin"
                            />
                        ) : (
                            <ArrowRight size={16} />
                        )}
                    </button>
                </form>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <ShieldCheck size={14} />
                    Ambiente de demonstração autenticado
                </p>
            </section>
        </main>
    );
}