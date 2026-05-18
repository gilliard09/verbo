import React from 'react';
import { ADMIN_TABS } from '../utils/constants';

const AdminTabs = ({ aba, setAba }) => (
  <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 overflow-x-auto">
    {ADMIN_TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setAba(tab.id)}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${aba === tab.id ? 'bg-white text-[#5B2DFF]' : 'text-gray-500'}`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default AdminTabs;
