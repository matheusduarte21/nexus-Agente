
'use client';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

import type { FormEvent } from 'react';

import {
    Bot,
    Send,
    Plus,
    LogOut,
    ShieldCheck,
    Package,
    Truck,
    BookOpen,
    LoaderCircle,
    Square,
    AlertTriangle,
    Radio,
} from 'lucide-react';

import {
    sendChat,
    streamChat,
    getErrorMessage,
} from '@/lib/api';

import type {
    ChatMessage as Message,
    CustomerIdentity,
    ChatRequest,
    PendingConfirmation,
    ConfirmationDecision,
} from '@/lib/chat.types';

import { ChatMessage } from './chat-message';

interface ChatInterfaceProps {
    token: string;
    customer: CustomerIdentity;
    onLogout: () => void;
}

const suggestions = [
    {
        icon: Package,
        title: 'Consultar pedido',
        message: 'Qual o status do pedido 12345?',
    },
    {
        icon: Truck,
        title: 'Entregas',
        message: 'Meu pedido está atrasado. O que posso fazer?',
    },
    {
        icon: BookOpen,
        title: 'Devoluções',
        message: 'Qual é a política de devolução?',
    },
    {
        icon: ShieldCheck,
        title: 'Cancelamento',
        message: 'Quero cancelar o pedido 12345.',
    },
];

export function ChatInterface({
    token,
    customer,
    onLogout,
}: ChatInterfaceProps) {
    const [sessionId, setSessionId] = useState(
        () => crypto.randomUUID(),
    );

    const [messages, setMessages] =
        useState<Message[]>([]);

    const [input, setInput] = useState('');

    const [loading, setLoading] = useState(false);

    const [progress, setProgress] = useState('');

    const [partialAnswer, setPartialAnswer] =
        useState('');

    const [error, setError] = useState('');

    const [useStreaming, setUseStreaming] =
        useState(true);

    const [pending, setPending] =
        useState<PendingConfirmation | null>(null);

    const activeRequest =
        useRef<AbortController | null>(null);

    const bottomRef =
        useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: 'smooth',
        });
    }, [messages, partialAnswer, progress, pending]);

    useEffect(() => {
        return () => {
            activeRequest.current?.abort();
        };
    }, []);

    function newConversation() {
        if (activeRequest.current || pending) {
            return;
        }

        setSessionId(crypto.randomUUID());

        setMessages([]);
        setInput('');
        setError('');
        setProgress('');
        setPartialAnswer('');
        setPending(null);
    }

    async function sendMessage(
        text: string,
        confirmation?: ConfirmationDecision,
    ) {
        const message = text.trim();

        if (
            !message ||
            message.length > 4000 ||
            activeRequest.current ||
            (pending && !confirmation)
        ) {
            return;
        }

        const controller = new AbortController();

        activeRequest.current = controller;

        setLoading(true);
        setError('');
        setPartialAnswer('');
        setProgress('Enviando mensagem...');
        setInput('');

        setMessages((previous) => [
            ...previous,
            {
                id: crypto.randomUUID(),
                role: 'user',
                content: message,
            },
        ]);

        const request: ChatRequest = {
            sessionId,
            message,
            ...(confirmation ? { confirmation } : {}),
        };

        try {
            const response = useStreaming
                ? await streamChat(
                    token,
                    request,
                    controller.signal,
                    (update) => {
                        if (update.kind === 'progress') {
                            setProgress(update.label);
                        }

                        if (update.kind === 'delta') {
                            setPartialAnswer(
                                (previous) => previous + update.text,
                            );
                        }
                    },
                )
                : await sendChat(
                    token,
                    request,
                    controller.signal,
                );

            setMessages((previous) => [
                ...previous,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: response.answer,
                    sources: response.sources,
                },
            ]);

            setPending(
                response.confirmation ?? null,
            );
        } catch (error: unknown) {
            const description = controller.signal.aborted
                ? 'Recebimento interrompido. Uma operação já enviada pode continuar no servidor.'
                : getErrorMessage(error);

            setError(
                confirmation
                    ? `${description} Não inicie outro cancelamento sem verificar o resultado.`
                    : description,
            );
        } finally {
            activeRequest.current = null;

            setLoading(false);
            setProgress('');
            setPartialAnswer('');
        }
    }

    function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        void sendMessage(input);
    }

    function decideCancellation(
        decision: 'confirm' | 'reject',
    ) {
        if (!pending || activeRequest.current) {
            return;
        }

        void sendMessage(
            decision === 'confirm'
                ? `Confirmo a solicitação de cancelamento do pedido ${pending.orderId}.`
                : `Não desejo cancelar o pedido ${pending.orderId}.`,
            {
                requestId: pending.requestId,
                decision,
            },
        );
    }

    return (
        <div className="flex h-dvh overflow-hidden">
            <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 p-5 md:flex">
                <div className="mb-8 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-600 p-2.5">
                        <Bot size={24} />
                    </div>

                    <div>
                        <h1 className="text-sm font-semibold">
                            Nexus Commerce
                        </h1>

                        <p className="text-xs text-slate-400">
                            AI Assistant
                        </p>
                    </div>
                </div>

                <button
                    onClick={newConversation}
                    disabled={loading || !!pending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-3 text-sm hover:bg-slate-800"
                >
                    <Plus size={18} />
                    Nova conversa
                </button>

                <div className="mt-8 space-y-2">
                    <p className="mb-3 text-xs font-semibold tracking-wider text-slate-500">
                        ATENDIMENTO
                    </p>

                    {suggestions.map(
                        ({ icon: Icon, title, message }) => (
                            <button
                                key={title}
                                onClick={() => void sendMessage(message)}
                                disabled={loading || !!pending}
                                className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm text-slate-300 hover:bg-slate-800"
                            >
                                <Icon size={18} />
                                {title}
                            </button>
                        ),
                    )}
                </div>

                <div className="mt-auto space-y-4">
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                        <Radio size={16} />

                        Streaming SSE

                        <input
                            type="checkbox"
                            checked={useStreaming}
                            disabled={loading}
                            onChange={(event) =>
                                setUseStreaming(event.target.checked)
                            }
                            className="ml-auto accent-blue-600"
                        />
                    </label>

                    <div className="border-t border-slate-800 pt-4">
                        <p className="text-xs text-slate-500">
                            Cliente autenticado
                        </p>

                        <p className="mt-1 break-all text-sm">
                            {customer.customerId}
                        </p>
                    </div>

                    <button
                        onClick={onLogout}
                        disabled={loading}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                    <div>
                        <h2 className="font-semibold">
                            Assistente virtual
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                            Sessão {sessionId.slice(0, 8)}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <ShieldCheck
                                size={16}
                                className="text-emerald-400"
                            />
                            Autenticado
                        </div>

                        <button
                            aria-label="Nova conversa"
                            onClick={newConversation}
                            disabled={loading || !!pending}
                            className="md:hidden"
                        >
                            <Plus size={20} />
                        </button>

                        <button
                            aria-label="Sair"
                            onClick={onLogout}
                            disabled={loading}
                            className="md:hidden"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="mx-auto max-w-3xl space-y-6">
                        {messages.length === 0 && (
                            <div className="py-10 text-center">
                                <div className="mx-auto mb-5 w-fit rounded-2xl bg-blue-600/15 p-5 text-blue-400">
                                    <Bot size={42} />
                                </div>

                                <h2 className="text-2xl font-semibold">
                                    Como posso ajudar?
                                </h2>

                                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                                    Consulte seus pedidos, acompanhe
                                    entregas e tire dúvidas sobre as
                                    políticas da Nexus Commerce.
                                </p>

                                <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
                                    {suggestions.map(
                                        ({ icon: Icon, title, message }) => (
                                            <button
                                                key={title}
                                                disabled={loading}
                                                onClick={() =>
                                                    void sendMessage(message)
                                                }
                                                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-blue-500"
                                            >
                                                <Icon
                                                    size={22}
                                                    className="mb-3 text-blue-400"
                                                />

                                                <p className="text-sm font-medium">
                                                    {title}
                                                </p>

                                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                                    {message}
                                                </p>
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                        {messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                            />
                        ))}

                        {loading && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-slate-800 p-2 text-blue-400">
                                    <Bot size={20} />
                                </div>

                                <div className="max-w-[85%] rounded-2xl border border-slate-800 bg-slate-900 p-4">
                                    {partialAnswer ? (
                                        <p className="whitespace-pre-wrap break-words text-sm leading-7">
                                            {partialAnswer}
                                        </p>
                                    ) : (
                                        <div
                                            role="status"
                                            className="flex items-center gap-2 text-sm text-slate-400"
                                        >
                                            <LoaderCircle
                                                size={16}
                                                className="animate-spin"
                                            />

                                            {progress || 'Processando...'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {pending && (
                            <section className="rounded-xl border border-amber-800/70 bg-amber-950/15 p-5">
                                <h3 className="flex items-center gap-2 font-medium text-amber-300">
                                    <AlertTriangle size={20} />
                                    Confirmação necessária
                                </h3>

                                <p className="mt-3 text-sm">
                                    Pedido: {pending.orderId}
                                </p>

                                <p className="mt-2 text-xs text-slate-400">
                                    Válida até{' '}
                                    {new Date(
                                        pending.expiresAt,
                                    ).toLocaleString('pt-BR')}
                                </p>

                                <p className="mt-3 text-xs leading-5 text-slate-400">
                                    Confirme somente se realmente deseja
                                    solicitar o cancelamento deste pedido.
                                </p>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button
                                        disabled={loading}
                                        onClick={() =>
                                            decideCancellation('confirm')
                                        }
                                        className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-amber-400"
                                    >
                                        Confirmar solicitação
                                    </button>

                                    <button
                                        disabled={loading}
                                        onClick={() =>
                                            decideCancellation('reject')
                                        }
                                        className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
                                    >
                                        Não cancelar
                                    </button>
                                </div>
                            </section>
                        )}

                        {error && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"
                            >
                                {error}
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>
                </section>

                <footer className="border-t border-slate-800 bg-slate-950/60 px-4 py-4">
                    <form
                        onSubmit={handleSubmit}
                        className="mx-auto max-w-3xl"
                    >
                        <div className="flex items-end gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3">
                            <textarea
                                aria-label="Mensagem"
                                value={input}
                                onChange={(event) =>
                                    setInput(event.target.value)
                                }
                                disabled={loading || !!pending}
                                maxLength={4000}
                                rows={2}
                                placeholder={
                                    pending
                                        ? 'Confirme ou recuse a solicitação acima.'
                                        : 'Digite sua mensagem...'
                                }
                                className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
                            />

                            {loading ? (
                                <button
                                    type="button"
                                    aria-label="Interromper recebimento"
                                    onClick={() =>
                                        activeRequest.current?.abort()
                                    }
                                    className="rounded-lg bg-slate-700 p-3"
                                >
                                    <Square size={18} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    aria-label="Enviar mensagem"
                                    disabled={!input.trim() || !!pending}
                                    className="rounded-lg bg-blue-600 p-3 hover:bg-blue-500"
                                >
                                    <Send size={18} />
                                </button>
                            )}
                        </div>

                        <div className="mt-3 flex justify-between gap-2 text-xs text-slate-500">
                            <span>
                                Assistente de IA · Ambiente demonstrativo
                            </span>

                            <span>
                                {input.length}/4000
                            </span>
                        </div>
                    </form>
                </footer>
            </main>
        </div>
    );
}
