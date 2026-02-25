"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import ReactFlow, { 
  type Node, 
  type Edge, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  type Connection,
  ReactFlowProvider,
  ConnectionMode,
  ConnectionLineType,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useUser } from "@clerk/nextjs";

import { ProfileModal } from '@/components/ProfileModal';
import { RelationshipModal } from '@/components/RelationshipModal';
import { NodeDetails } from '@/components/NodeDetails';
import { PersonNode } from '@/components/PersonNode';
import { PERSON_FIELDS } from '@/constants/questions';
import RelationshipEdge from '@/components/RelationshipEdge';
import { Loader2, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const initialNodes: Node[] = [
  {
    id: 'me',
    data: { label: 'Me (You)', type: 'user', responses: {} },
    position: { x: 250, y: 250 },
    type: 'personNode', 
  },
];

const initialEdges: Edge[] = [];

function Flow() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { onboardingStep, setOnboardingStep } = useAppStore();
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const nodeTypes = useMemo(() => ({ personNode: PersonNode }), []);
  const edgeTypes = useMemo(() => ({ relationshipEdge: RelationshipEdge }), []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'person' | 'connection' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  useEffect(() => {
    if (!isUserLoaded || !user) return;

    const fetchGraph = async () => {
      try {
        const res = await fetch('/api/graph');
        if (res.ok) {
          const data = await res.json();
          if (data.nodes && data.nodes.length > 0) {
            const updatedNodes = data.nodes.map((n: Node) => {
              if (n.id === 'me' && n.data.label === 'Me (You)' && user?.firstName) {
                return { ...n, data: { ...n.data, label: user.firstName } };
              }
              return n;
            });
            setNodes(updatedNodes);
            setEdges(data.edges.map((e: Edge) => ({ ...e, type: 'relationshipEdge' })));
          } else if (user?.firstName) {
            setNodes(nds => nds.map(n => n.id === 'me' ? { ...n, data: { ...n.data, label: user.firstName } } : n));
          }
        }
      } catch (e) {
        console.error("Failed to load graph", e);
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchGraph();
  }, [isUserLoaded, user, setNodes, setEdges]);

  // Automatically fit view when the first person is added
  useEffect(() => {
    if (nodes.length === 2 && onboardingStep === 2) {
      setTimeout(() => {
        fitView({ padding: 0.4, duration: 800 });
      }, 100);
    }
  }, [nodes.length, onboardingStep, fitView]);

  useEffect(() => {
    if (!isDataLoaded) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch('/api/graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges })
        });
      } catch (e) {
        console.error("Failed to auto-save", e);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [nodes, edges, isDataLoaded]);

  const onProfileSave = (formData: Record<string, string>, shouldClose: boolean = true) => {
    if (editingId) {
      if (modalType === 'person') {
        setNodes((nds) => nds.map((n) => {
          if (n.id === editingId) {
            return {
              ...n,
              data: {
                ...n.data,
                label: formData[PERSON_FIELDS.NAME] || n.data.label,
                responses: { ...n.data.responses, ...formData }
              }
            };
          }
          return n;
        }));
      } else if (modalType === 'connection') {
        setEdges((eds) => eds.map((e) => {
          if (e.id === editingId) {
            return {
              ...e,
              data: {
                ...e.data,
                responses: { ...e.data.responses, ...formData }
              }
            };
          }
          return e;
        }));
      }
    } else {
      if (modalType === 'person') {
        const id = `person-${Date.now()}`;
        
        // If it's the first person added (only 'me' exists), position it nicely to the left
        const isFirstPerson = nodes.length === 1;
        const position = isFirstPerson 
          ? { x: nodes[0].position.x - 250, y: nodes[0].position.y }
          : { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 };

        const newNode: Node = {
          id,
          data: { label: formData[PERSON_FIELDS.NAME] || 'New Person', type: 'person', responses: formData },
          position,
          type: 'personNode',
        };
        setNodes((nds) => nds.concat(newNode));
        
        // Onboarding Step 1 -> 2
        if (onboardingStep === 1) {
          setOnboardingStep(2);
        }
      } else if (modalType === 'connection' && pendingConnection) {
        const edgeId = `e${pendingConnection.source}-${pendingConnection.target}`;
        const newEdge: Edge = { 
          ...pendingConnection, 
          source: pendingConnection.source!,
          target: pendingConnection.target!,
          id: edgeId, 
          type: 'relationshipEdge',
          data: { responses: formData } 
        };
        setEdges((eds) => addEdge(newEdge, eds));
        
        if (!shouldClose) {
          setEditingId(edgeId);
          setSelectedEdge(newEdge);
        }
        setPendingConnection(null);

        // Onboarding Step 3 -> 4 (Only when actually finishing/closing)
        if (onboardingStep === 3 && shouldClose) {
          setOnboardingStep(4);
        }
      }
    }

    if (shouldClose) {
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setEditingId(null);
    setPendingConnection(null);
    setSelectedEdge(null);
  };

  if (!isUserLoaded || !isDataLoaded) return <div className="h-full flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin text-stone-800" size={48} />
    <p className="text-stone-500 font-medium">Loading your therapy graph...</p>
  </div>;

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-none">
        <button 
          id="onboarding-add-person"
          onClick={() => { setEditingId(null); setModalType('person'); setIsModalOpen(true); }}
          className="pointer-events-auto px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-xl hover:bg-[#FFFEFC] transition shadow-sm font-bold text-sm flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} /> Add Person
        </button>
        {isSaving && (
          <div className="px-3 py-2 bg-white/80 backdrop-blur border border-stone-100 rounded-xl flex items-center gap-2 text-xs text-stone-500 font-bold shadow-sm">
            <Loader2 size={12} className="animate-spin" /> Saving...
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(params) => { 
          setEditingId(null);
          setSelectedEdge(null);
          setPendingConnection(params); 
          setModalType('connection'); 
          setIsModalOpen(true); 

          // Onboarding Step 2 -> 3
          if (onboardingStep === 2) {
            setOnboardingStep(3);
          }
        }}
        onNodeClick={(_, node) => { setSelectedNode(node); setSelectedEdge(null); }}
        onEdgeClick={(_, edge) => { setSelectedEdge(edge); setEditingId(edge.id); setModalType('connection'); setIsModalOpen(true); }}
        onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
        connectionLineType={ConnectionLineType.Straight}
        connectionLineStyle={{ stroke: '#a78bfa', strokeWidth: 3, zIndex: -1 }}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
      >
        <Background color="#f5f5f4" gap={24} size={1.2} />
        <Controls className="!bg-[#FFFEFC] !border-stone-200 !shadow-sm !rounded-xl overflow-hidden" />
      </ReactFlow>

      {selectedNode && (
        <div className="absolute top-4 right-4 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <NodeDetails node={selectedNode} edge={null} onClose={() => setSelectedNode(null)} onEdit={() => { setEditingId(selectedNode.id); setModalType('person'); setIsModalOpen(true); }} onDelete={() => { setNodes(nds => nds.filter(n => n.id !== selectedNode.id)); setSelectedNode(null); }} />
          </div>
        </div>
      )}

      {isModalOpen && modalType === 'person' && (
        <ProfileModal isOpen={isModalOpen} title={editingId ? "Edit Profile" : "New Person"} fields={PERSON_FIELDS} initialValues={editingId ? selectedNode?.data.responses : {}} onClose={handleCloseModal} onSave={onProfileSave} />
      )}

      {isModalOpen && modalType === 'connection' && (
        <RelationshipModal
          isOpen={isModalOpen}
          sourceId={(editingId ? selectedEdge?.source : pendingConnection?.source) || undefined}
          targetId={(editingId ? selectedEdge?.target : pendingConnection?.target) || undefined}
          sourceLabel={nodes.find(n => n.id === (editingId ? selectedEdge?.source : pendingConnection?.source))?.data.label || 'Someone'}
          targetLabel={nodes.find(n => n.id === (editingId ? selectedEdge?.target : pendingConnection?.target))?.data.label || 'Someone'}
          initialValues={editingId ? selectedEdge?.data.responses : {}}
          onClose={handleCloseModal}
          onSave={onProfileSave}
          onDelete={() => { setEdges(eds => eds.filter(e => e.id !== selectedEdge?.id)); handleCloseModal(); }}
        />
      )}
    </div>
  );
}

export default function RelationshipsPage() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}