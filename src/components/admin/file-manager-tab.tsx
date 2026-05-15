"use client";

import React, { useState, useEffect } from 'react';
import { 
    Folder, File, ChevronRight, Save, 
    ArrowLeft, Loader2, RefreshCw, FileText,
    AlertTriangle, Check
} from 'lucide-react';
import { toast } from 'sonner';

interface FileItem {
    name: string;
    size: number;
    type: 'file' | 'directory';
    modifiedAt: string;
}

export function FileManagerTab() {
    const [path, setPath] = useState('/');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!editingFile) {
            fetchFiles(path);
        }
    }, [path, editingFile]);

    const fetchFiles = async (currentPath: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/server/files/list?path=${encodeURIComponent(currentPath)}`);
            if (!res.ok) throw new Error('Erro ao listar arquivos');
            const data = await res.json();
            setFiles(data.files || []);
        } catch (error) {
            toast.error('Erro ao buscar arquivos do servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileClick = async (file: FileItem) => {
        if (file.type === 'directory') {
            setPath(`${path === '/' ? '' : path}/${file.name}`);
        } else {
            setLoading(true);
            const fullPath = `${path === '/' ? '' : path}/${file.name}`;
            try {
                const res = await fetch(`/api/server/files/read?file=${encodeURIComponent(fullPath)}`);
                if (!res.ok) throw new Error('Erro ao ler arquivo');
                const data = await res.json();
                setEditingFile(fullPath);
                setFileContent(data.content || '');
            } catch (error) {
                toast.error('Erro ao ler o conteúdo do arquivo.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSave = async () => {
        if (!editingFile) return;
        setSaving(true);
        try {
            const res = await fetch('/api/server/files/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: editingFile, content: fileContent }),
            });
            if (!res.ok) throw new Error('Erro ao salvar arquivo');
            toast.success('Arquivo salvo com sucesso!');
            setEditingFile(null);
        } catch (error) {
            toast.error('Erro ao salvar alterações no servidor.');
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => {
        const parts = path.split('/').filter(Boolean);
        parts.pop();
        setPath('/' + parts.join('/'));
    };

    if (editingFile) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => setEditingFile(null)}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                        <ArrowLeft size={14} /> Voltar para lista
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                            {editingFile}
                        </span>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl transition-all active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/10 to-transparent blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                    <textarea 
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        spellCheck={false}
                        className="relative w-full h-[600px] bg-black/60 border border-white/5 rounded-3xl p-8 font-mono text-[12px] leading-relaxed text-zinc-300 focus:outline-none focus:border-yellow-500/40 transition-all scrollbar-thin scrollbar-thumb-white/10"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {path !== '/' && (
                        <button 
                            onClick={goBack}
                            className="p-2 bg-white/5 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all"
                        >
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Arquivos do Servidor</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">Caminho:</span>
                            <span className="text-[9px] text-yellow-500 font-mono font-bold tracking-tight bg-yellow-500/5 px-2 py-0.5 rounded border border-yellow-500/10">{path}</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => fetchFiles(path)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Acessando FTP do servidor...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-6">
                        {files.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
                                Pasta vazia ou erro de acesso
                            </div>
                        ) : (
                            files
                            .sort((a, b) => {
                                if (a.type === b.type) return a.name.localeCompare(b.name);
                                return a.type === 'directory' ? -1 : 1;
                            })
                            .map((file) => (
                                <button 
                                    key={file.name}
                                    onClick={() => handleFileClick(file)}
                                    className="flex items-center gap-3 p-4 bg-black/20 border border-white/5 hover:border-yellow-500/20 hover:bg-black/40 rounded-2xl transition-all group text-left"
                                >
                                    <div className={`p-2.5 rounded-xl ${file.type === 'directory' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-500/10 text-zinc-400 group-hover:text-yellow-500'} transition-colors`}>
                                        {file.type === 'directory' ? <Folder size={18} /> : <FileText size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-tight text-white group-hover:text-yellow-500 transition-colors truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                                            {file.type === 'directory' ? 'Pasta' : `${(file.size / 1024).toFixed(1)} KB`}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-[24px] p-6 flex items-start gap-4">
                <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Aviso Importante</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed max-w-2xl">
                        Edite arquivos de configuração apenas se souber o que está fazendo. Alterações incorretas podem impedir o servidor de iniciar ou causar instabilidade. Sempre mantenha um backup dos arquivos originais.
                    </p>
                </div>
            </div>
        </div>
    );
}
