
import {
    Bot,
    User,
    BookOpen,
    FileText,
} from 'lucide-react';

import type {
    ChatMessage as Message,
} from '@/lib/chat.types';

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({
    message,
}: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <article
            className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''
                }`}
        >
            <div
                className={`shrink-0 rounded-xl p-2 ${isUser
                        ? 'bg-blue-600'
                        : 'bg-slate-800 text-blue-400'
                    }`}
            >
                {isUser ? (
                    <User size={20} />
                ) : (
                    <Bot size={20} />
                )}
            </div>

            <div
                className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-800 bg-slate-900'
                    }`}
            >
                <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {message.content}
                </p>

                {!!message.sources?.length && (
                    <section className="mt-4 border-t border-slate-700 pt-3">
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            <BookOpen size={14} />
                            Fontes consultadas
                        </h3>

                        <div className="space-y-2">
                            {message.sources.map((source) => (
                                <div
                                    key={source.chunkId}
                                    className="flex gap-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3"
                                >
                                    <FileText
                                        size={18}
                                        className="mt-1 shrink-0 text-blue-400"
                                    />

                                    <div className="min-w-0">
                                        <p className="break-words text-sm font-medium">
                                            {source.title}
                                        </p>

                                        <p className="break-words text-xs text-slate-400">
                                            {source.sourceKey}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Versão {source.version}
                                            {' · '}
                                            Trecho {source.chunkIndex + 1}

                                            {source.pageNumber !== null &&
                                                ` · Página ${source.pageNumber}`}

                                            {source.section &&
                                                ` · ${source.section}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </article>
    );
}
