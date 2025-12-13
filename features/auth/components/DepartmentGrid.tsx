import React from 'react';
import { useTranslation } from 'react-i18next';
import { BedDouble, Utensils, ConciergeBell, Users } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { DepartmentType } from '../../../types';

const departments: { id: DepartmentType; icon: React.FC<any>; labelKey: string }[] = [
  { id: 'housekeeping', icon: BedDouble, labelKey: 'dept_housekeeping' },
  { id: 'kitchen', icon: Utensils, labelKey: 'dept_kitchen' },
  { id: 'front_office', icon: ConciergeBell, labelKey: 'dept_front_office' },
  { id: 'management', icon: Users, labelKey: 'dept_management' },
];

export const DepartmentGrid: React.FC = () => {
  const { setDepartment } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-4 h-full content-center">
      {departments.map((dept) => (
        <button
          key={dept.id}
          onClick={() => setDepartment(dept.id)}
          className="flex flex-col items-center justify-center aspect-square bg-white/5 hover:bg-accent/20 border border-white/10 hover:border-accent rounded-2xl p-4 transition-all duration-300 active:scale-95 group"
        >
          <div className="mb-4 p-4 rounded-full bg-primary/40 group-hover:bg-accent group-hover:text-primary transition-colors text-accent">
            <dept.icon className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <span className="text-white font-medium text-center text-sm md:text-base leading-tight">
            {t(dept.labelKey)}
          </span>
        </button>
      ))}
    </div>
  );
};