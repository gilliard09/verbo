import React from 'react';

const AdminHeader = ({ title = 'Gestão Verbo' }) => {
  return (
    <div className="p-5 border-b border-slate-100 bg-white sticky top-0 z-50">
      <h1 className="font-black text-lg uppercase italic text-slate-800">{title}</h1>
    </div>
  );
};

export default AdminHeader;
