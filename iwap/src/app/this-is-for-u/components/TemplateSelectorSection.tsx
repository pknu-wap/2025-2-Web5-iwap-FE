"use client";

import { type PostcardTemplate } from "../types";

type TemplateSelectorSectionProps = {
  templates: PostcardTemplate[];
  activeTemplateId: string;
  onSelect: (id: string) => void;
};

export function TemplateSelectorSection({
  templates,
  activeTemplateId,
  onSelect,
}: TemplateSelectorSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
        Postcard Template
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {templates.map((item) => {
          const isActive = item.id === activeTemplateId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`min-w-[180px] rounded-2xl border p-4 text-left transition ${
                isActive
                  ? "border-rose-300 bg-rose-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-rose-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-10 w-10 rounded-full border border-white shadow-inner"
                  style={{ background: item.frontColor }}
                />
                <div>
                  <div className="text-sm font-semibold text-slate-700">
                    {item.name}
                  </div>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
