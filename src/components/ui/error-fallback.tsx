import React from 'react';

interface ErrorFallbackProps {
    title?: string;
    message: string;
}

export function ErrorFallback({
    title = 'Ocurrió un error',
    message,
}: ErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-red-500/50">
            <div className="text-5xl mb-4">😞</div>
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                {title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
    );
}