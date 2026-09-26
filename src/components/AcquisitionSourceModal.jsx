import React, { useState } from 'react';
import {
  Youtube,
  Instagram,
  MessageCircle,
  Facebook,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const OPTIONS = [
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'threads', label: 'Threads', icon: MessageCircle },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'google', label: 'Google', icon: Search },
  { value: 'other', label: 'Outro', icon: MoreHorizontal },
];

const AcquisitionSourceModal = ({ session, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const handleSelect = async (value) => {
    if (saving) return;

    setSelected(value);
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ acquisition_source: value })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      onClose();
    } catch (err) {
      console.error('Erro ao salvar origem de aquisição:', err);
      setError('Não conseguimos salvar sua resposta. Tente novamente.');
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acquisition-title"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="px-5 pb-4 pt-6 sm:px-6 sm:pt-7">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EEFF] text-[#4C1D95]">
            <MessageCircle size={19} strokeWidth={2.2} />
          </div>

          <h2
            id="acquisition-title"
            className="pr-2 text-xl font-black tracking-tight text-[#0F172A]"
          >
            Como você conheceu o Verbo?
          </h2>

          <p className="mt-1.5 text-xs leading-5 text-gray-500">
            Queremos entender como os pregadores estão chegando até aqui. Isso nos ajuda a saber o que está funcionando.
          </p>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Escolha uma opção
          </p>

          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map(({ value, label, icon: Icon }) => {
              const isSelected = selected === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSelect(value)}
                  disabled={saving}
                  className={[
                    'group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all',
                    isSelected
                      ? 'border-[#4C1D95] bg-[#F5F1FF] text-[#4C1D95]'
                      : 'border-gray-100 bg-gray-50/70 text-slate-700 hover:border-[#DDD0F7] hover:bg-[#F8F5FF]',
                    saving && !isSelected ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isSelected
                        ? 'bg-[#4C1D95] text-white'
                        : 'bg-white text-gray-400 group-hover:text-[#4C1D95]',
                    ].join(' ')}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </span>

                  <span className="flex-1 text-xs font-semibold">{label}</span>

                  {isSelected && saving && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4C1D95]/20 border-t-[#4C1D95]" />
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 text-center text-xs font-medium text-red-500">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-[10px] leading-4 text-gray-400">
            Você só verá esta pergunta uma vez.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcquisitionSourceModal;
