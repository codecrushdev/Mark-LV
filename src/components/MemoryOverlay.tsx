import React, { useState } from 'react';
import { MemoryFact, KnowledgeNode, KnowledgeLink } from '../types.ts';
import { Brain, X, Trash2, Search, Network, List, Plus } from 'lucide-react';

interface MemoryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  facts: MemoryFact[];
  onForgetFact: (id: string) => void;
  onAddFact: (category: MemoryFact['category'], key: string, value: string) => void;
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
  accentColor: string;
}

export const MemoryOverlay: React.FC<MemoryOverlayProps> = ({
  isOpen,
  onClose,
  facts,
  onForgetFact,
  onAddFact,
  nodes,
  links,
  accentColor,
}) => {
  const [tab, setTab] = useState<'facts' | 'graph'>('facts');
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState<MemoryFact['category']>('User');
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  if (!isOpen) return null;

  const filteredFacts = facts.filter(
    (f) =>
      f.key.toLowerCase().includes(filter.toLowerCase()) ||
      f.value.toLowerCase().includes(filter.toLowerCase()) ||
      f.category.toLowerCase().includes(filter.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newVal.trim()) return;
    onAddFact(newCat, newKey.trim(), newVal.trim());
    setNewKey('');
    setNewVal('');
    setShowAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-2xl bg-[#000d14] border border-[#1a5c7a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#010d14] border-b border-[#0d3347]">
          <div className="flex items-center gap-2 text-sm text-[#8ffcff]">
            <Brain className="w-4 h-4 text-[#00d4ff]" />
            <span className="font-bold tracking-wider">WHAT JARVIS REMEMBERS (RECALLABLE MEMORY)</span>
          </div>
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex rounded bg-[#011520] p-0.5 border border-[#0d3347] text-xs">
              <button
                onClick={() => setTab('facts')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  tab === 'facts' ? 'bg-[#001f2e] text-[#8ffcff] font-bold' : 'text-[#3a8a9a]'
                }`}
              >
                <List className="w-3 h-3" />
                <span>FACTS</span>
              </button>
              <button
                onClick={() => setTab('graph')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  tab === 'graph' ? 'bg-[#001f2e] text-[#8ffcff] font-bold' : 'text-[#3a8a9a]'
                }`}
              >
                <Network className="w-3 h-3" />
                <span>KNOWLEDGE GRAPH</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:text-[#ff3355] text-[#3a8a9a] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subtitle Caption */}
        <div className="px-4 py-2 bg-[#001524] border-b border-[#0d3347] flex items-center justify-between text-[11px] text-[#3a8a9a]">
          <span>
            {facts.length} stored facts in local memory. Nothing here is sent anywhere. Delete any entry in one click.
          </span>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-[#00d4ff] hover:underline cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>LEARN FACT</span>
          </button>
        </div>

        {/* Add Fact Form */}
        {showAdd && (
          <form onSubmit={handleAddSubmit} className="p-3 bg-[#010f18] border-b border-[#0d3347] flex flex-wrap gap-2 text-xs">
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as any)}
              className="bg-[#00060a] border border-[#0d3347] rounded px-2 py-1 text-[#8ffcff] outline-none"
            >
              <option value="User">User</option>
              <option value="Preferences">Preferences</option>
              <option value="Projects">Projects</option>
              <option value="Hardware">Hardware</option>
              <option value="Work">Work</option>
            </select>
            <input
              type="text"
              placeholder="Key (e.g. coffee_order)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="flex-1 bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1 text-[#8ffcff] outline-none"
            />
            <input
              type="text"
              placeholder="Value (e.g. Double espresso, oat milk)"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              className="flex-1 bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1 text-[#8ffcff] outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-[#00d4ff] text-[#00060a] font-bold cursor-pointer"
            >
              SAVE
            </button>
          </form>
        )}

        {/* Content Body */}
        {tab === 'facts' ? (
          <div className="flex-1 overflow-hidden flex flex-col p-4">
            {/* Filter */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#3a8a9a]" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search recalled memories..."
                className="w-full bg-[#00060a] border border-[#0d3347] focus:border-[#00d4ff] rounded-lg pl-9 pr-3 py-2 text-xs text-[#8ffcff] outline-none font-mono"
              />
            </div>

            {/* Facts list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {filteredFacts.length === 0 ? (
                <div className="text-center text-[#3a8a9a] text-xs py-8">No memories matching query.</div>
              ) : (
                filteredFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#010f18] border border-[#0d3347] hover:border-[#1a5c7a] transition-colors"
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#001f2e] text-[#00d4ff]">
                          {fact.category.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-[#8ffcff]">{fact.key.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-xs text-[#5ab8cc] mt-1">{fact.value}</div>
                      <div className="text-[9px] text-[#3a8a9a] mt-0.5">Updated: {fact.updated}</div>
                    </div>

                    <button
                      onClick={() => onForgetFact(fact.id)}
                      className="p-1.5 rounded hover:bg-[#ff3355]/20 text-[#3a8a9a] hover:text-[#ff3355] transition-colors cursor-pointer"
                      title="Forget this fact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Knowledge Graph visualizer */
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
            <div className="text-xs text-[#3a8a9a] leading-relaxed">
              Synthesized knowledge graph linking entities, projects, and personal affinities.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347]">
                <div className="text-xs font-bold text-[#00d4ff] mb-2">ENTITIES &amp; CONCEPTS</div>
                <div className="flex flex-col gap-1.5">
                  {nodes.map((n) => (
                    <div key={n.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-[#00060a] border border-[#0d3347]">
                      <span className="text-[#8ffcff]">{n.label}</span>
                      <span className="text-[10px] text-[#3a8a9a] uppercase">{n.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347]">
                <div className="text-xs font-bold text-[#00ff88] mb-2">RELATIONSHIPS</div>
                <div className="flex flex-col gap-1.5">
                  {links.map((l, i) => (
                    <div key={i} className="text-[11px] p-1.5 rounded bg-[#00060a] border border-[#0d3347] flex items-center gap-1.5 text-[#5ab8cc]">
                      <span className="font-bold text-[#8ffcff]">{l.source}</span>
                      <span className="text-[#ffaa00]">--[{l.relation}]--&gt;</span>
                      <span className="font-bold text-[#8ffcff]">{l.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-[#010d14] border-t border-[#0d3347] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#001f2e] hover:bg-[#00344d] border border-[#1a5c7a] text-xs font-bold text-[#8ffcff] cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
