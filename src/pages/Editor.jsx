import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { supabase } from '../supabaseClient';
import { 
  Bold, Italic, List, ListOrdered, 
  ChevronLeft, Save, Loader2 
} from 'lucide-react';

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[300px] pb-20',
      },
    },
  });

  // Carregar dados se for edição
  useEffect(() => {
    if (id) {
      async function loadSermao() {
        setLoading(true);
        const { data, error } = await supabase
          .from('sermoes')
          .select('*')
          .eq('id', id)
          .single();

        if (data && !error) {
          setTitulo(data.titulo);
          editor?.commands.setContent(data.conteudo);
        }
        setLoading(false);
      }
      loadSermao();
    }
  }, [id, editor]);

  // FUNÇÃO SALVAR ATUALIZADA
  const salvar = async () => {
    if (!editor || !titulo.trim()) {
      alert("Por favor, dê um título ao seu sermão.");
      return;
    }

    setSalvando(true);
    const html = editor.getHTML();
    
    try {
      if (id) {
        // Modo Edição: Atualiza o existente
        const { error } = await supabase
          .from('sermoes')
          .update({ titulo: titulo, conteudo: html })
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Modo Criação: Insere novo e captura o ID gerado
        const { data, error } = await supabase
          .from('sermoes')
          .insert([{ titulo: titulo, conteudo: html }])
          .select()
          .single();
        
        if (error) throw error;
        
        // Redireciona para a URL com ID para que os próximos "salvar" sejam updates
        if (data) {
          navigate(`/editor/${data.id}`, { replace: true });
        }
      }
      // Feedback visual simples
      console.log("Salvo com sucesso!");
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-purple-600" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar Superior */}
      <header className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
        <button onClick={() => navigate('/')} className="p-2 text-gray-500">
          <ChevronLeft size={28} />
        </button>

        <button 
          onClick={salvar} 
          disabled={salvando}
          className="bg-[#6D28D9] text-white px-5 py-2 rounded-full font-bold flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
        >
          {salvando ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </header>

      <main className="p-6">
        <input 
          type="text" 
          placeholder="Título do Sermão..."
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full text-3xl font-bold border-none outline-none mb-6 placeholder:text-gray-200"
        />

        {/* Menu de Formatação Flutuante para Mobile */}
        <div className="flex gap-2 mb-4 overflow-x-auto py-2 border-b border-gray-50 sticky top-[73px] bg-white z-10">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
          >
            <Bold size={20} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
          >
            <Italic size={20} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
          >
            <List size={20} />
          </button>
        </div>

        <EditorContent editor={editor} />
      </main>
    </div>
  );
};

export default Editor;