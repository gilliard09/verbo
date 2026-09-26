import React, { useState } from 'react';
import {
  Youtube,
  Instagram,
  MessageCircle,
  Search,
  Users,
  Church,
  MoreHorizontal,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const OPTIONS = [
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'threads', label: 'Threads', icon: MessageCircle },
  { value: 'google', label: 'Google', icon: Search },
  { value: 'referral', label: 'Indicação de alguém', icon: Users },
  { value: 'church_event', label: 'Igreja ou evento', icon: Church },
  { value: 'other', label: 'Outro', icon: MoreHorizontal },
  { value: 'prefer_not_to_say', label: 'Prefiro não responder', icon: EyeOff },
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
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EEFF] text-[#4C1D95]">
            <MessageCircle size={22} strokeWidth={2.2} />
          </div>

          <h2
            id="acquisition-title"
            className="pr-8 text-2xl font-black tracking-tight text-[#0F172A]"
          >
            Como você conheceu o Verbo?
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
            Queremos entender como os pregadores estão chegando até aqui.
            Isso nos ajuda a saber o que está funcionando e a levar o Verbo para mais pessoas.
          </p>
        </div>

        <div className="px-6 pb-7 sm:px-8 sm:pb-8">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Escolha uma opção
          </p>

          <div className="grid grid-cols-1 gap-2">
            {OPTIONS.map(({ value, label, icon: Icon }) => {
              const isSelected = selected === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSelect(value)}
                  disabled={saving}
                  className={[
                    'group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                    isSelected
                      ? 'border-[#4C1D95] bg-[#F5F1FF] text-[#4C1D95]'
                      : 'border-gray-100 bg-gray-50/70 text-slate-700 hover:border-[#DDD0F7] hover:bg-[#F8F5FF]',
                    saving && !isSelected ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isSelected
                        ? 'bg-[#4C1D95] text-white'
                        : 'bg-white text-gray-400 group-hover:text-[#4C1D95]',
                    ].join(' ')}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </span>

                  <span className="flex-1 text-sm font-semibold">{label}</span>

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

          <p className="mt-5 text-center text-[11px] leading-5 text-gray-400">
            Você só verá esta pergunta uma vez.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcquisitionSourceModal;
