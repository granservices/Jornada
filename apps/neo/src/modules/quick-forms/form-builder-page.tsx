import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DropItem } from '@react-types/shared';
import {
  Asterisk,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  GripVertical,
  LayoutPanelTop,
  ListFilter,
  Lock,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  SquareDashedMousePointer,
  TextCursorInput,
  Type,
  UploadCloud,
  Trash2,
  X,
} from 'lucide-react';
import { DropIndicator, ListBox, ListBoxItem, useDragAndDrop } from 'react-aria-components';
import { useEffect, useMemo, useState, type DragEvent as ReactDragEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DatePicker } from '../../components/ui/date-picker';
import { NumberField } from '../../components/ui/number-field';
import { SelectField } from '../../components/ui/select-field';
import { SectionCard } from '../../components/ui/section-card';
import {
  createDynamicForm,
  listDynamicForms,
  listOptionSources,
  queryOptionSource,
  type OptionSourceSummary,
  type DynamicFormDefinition,
  type FormOwnerType,
} from './forms-api';
import { type SupportFormFieldType } from '../tickets/support-api';
import { cn } from '../../lib/cn';

type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'exists'
  | 'in'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual';
type ConditionMode = 'all' | 'any';
type SectionColumns = 1 | 2 | 3;
type SelectOptionsMode = 'MANUAL' | 'REMOTE';
type BuilderNodeKind = 'field' | 'section' | 'content';

type BuilderCondition = {
  id: string;
  fieldCode: string;
  operator: ConditionOperator;
  value: string;
  valuesText: string;
};

type BuilderConditionGroup = {
  mode: ConditionMode;
  clauses: BuilderCondition[];
};

type BaseNode = {
  id: string;
  kind: BuilderNodeKind;
};

type BuilderFieldNode = BaseNode & {
  kind: 'field';
  fieldType: SupportFormFieldType;
  code: string;
  codeMode: 'AUTO' | 'MANUAL';
  label: string;
  required: boolean;
  sensitive: boolean;
  helpText: string;
  optionsText: string;
  optionsMode: SelectOptionsMode;
  optionSourceKey: string;
  visibleWhen: BuilderConditionGroup | null;
  requiredWhen: BuilderConditionGroup | null;
};

type BuilderSectionNode = BaseNode & {
  kind: 'section';
  title: string;
  description: string;
  columns: SectionColumns;
  children: BuilderChildNode[];
};

type BuilderContentNode = BaseNode & {
  kind: 'content';
  title: string;
  content: string;
};

type BuilderChildNode = BuilderFieldNode | BuilderContentNode;
type BuilderNode = BuilderFieldNode | BuilderSectionNode | BuilderContentNode;

type LibraryPreset = {
  id: string;
  kind: BuilderNodeKind;
  label: string;
  description: string;
  icon: typeof TextCursorInput;
  fieldType?: SupportFormFieldType;
};

type DragPayload =
  | {
      source: 'library';
      presetId: string;
    }
  | {
      source: 'canvas';
      nodeId: string;
    };

type PublicationDraft = {
  payload: Parameters<typeof createDynamicForm>[0];
  title: string;
  key: string;
  version: {
    from: string;
    to: string;
  };
  summary: {
    totalBlocks: number;
    totalFields: number;
    totalSections: number;
    withConditions: number;
    withValidation: number;
  };
};

const BUILDER_DRAG_TYPE = 'application/x-jornada-builder-node';

const actionButtonClass =
  'inline-flex h-7 items-center justify-center gap-1.5 rounded-[4px] border px-2.5 text-[10px] font-semibold transition disabled:opacity-60';
const softButtonClass =
  'border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-panel-active)]';
const primaryButtonClass =
  'border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-2)]';
const dangerButtonClass =
  'border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] text-[var(--admin-danger-text)] hover:opacity-90';
const inputClass =
  'h-8 w-full rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[11px] text-[var(--admin-text-primary)] outline-none transition placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)]';
const textareaClass =
  'min-h-16 w-full rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[11px] leading-5 text-[var(--admin-text-primary)] outline-none transition placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)]';

const selectedCanvasCardStyle = {
  borderColor: 'var(--admin-border-strong)',
  backgroundColor: 'var(--admin-surface-3)',
} as const;

const libraryPresets: LibraryPreset[] = [
  { id: 'field-text', kind: 'field', fieldType: 'TEXT', label: 'Campo curto', description: 'Uma linha curta.', icon: TextCursorInput },
  { id: 'field-textarea', kind: 'field', fieldType: 'TEXTAREA', label: 'Textarea', description: 'Descricao ou observacao.', icon: TextCursorInput },
  { id: 'field-select', kind: 'field', fieldType: 'SELECT', label: 'Selecao', description: 'Opcoes controladas.', icon: ListFilter },
  { id: 'field-boolean', kind: 'field', fieldType: 'BOOLEAN', label: 'Sim ou nao', description: 'Decisao binaria.', icon: SquareDashedMousePointer },
  { id: 'field-date', kind: 'field', fieldType: 'DATE', label: 'Data', description: 'Datas e prazos.', icon: TextCursorInput },
  { id: 'field-number', kind: 'field', fieldType: 'NUMBER', label: 'Numero', description: 'Valores ou quantidades.', icon: TextCursorInput },
  { id: 'field-file', kind: 'field', fieldType: 'FILE', label: 'Arquivo', description: 'Envio de anexo.', icon: TextCursorInput },
  { id: 'section', kind: 'section', label: 'Secao', description: 'Agrupa blocos e define colunas.', icon: LayoutPanelTop },
  { id: 'content', kind: 'content', label: 'Texto de apoio', description: 'Instrucoes readonly.', icon: Type },
];

const operatorOptionsByFieldType: Record<SupportFormFieldType, Array<{ value: ConditionOperator; label: string }>> = {
  TEXT: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'contains', label: 'Contem' },
    { value: 'exists', label: 'Preenchido' },
  ],
  TEXTAREA: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'contains', label: 'Contem' },
    { value: 'exists', label: 'Preenchido' },
  ],
  SELECT: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'in', label: 'Entre opcoes' },
    { value: 'exists', label: 'Preenchido' },
  ],
  BOOLEAN: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'exists', label: 'Preenchido' },
  ],
  DATE: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'greaterThan', label: 'Depois de' },
    { value: 'greaterThanOrEqual', label: 'No dia ou depois' },
    { value: 'lessThan', label: 'Antes de' },
    { value: 'lessThanOrEqual', label: 'No dia ou antes' },
    { value: 'exists', label: 'Preenchido' },
  ],
  NUMBER: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'greaterThan', label: 'Maior que' },
    { value: 'greaterThanOrEqual', label: 'Maior ou igual' },
    { value: 'lessThan', label: 'Menor que' },
    { value: 'lessThanOrEqual', label: 'Menor ou igual' },
    { value: 'exists', label: 'Preenchido' },
  ],
  FILE: [{ value: 'exists', label: 'Anexo enviado' }],
};

export function FormBuilderPage() {
  const { formKey } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [key, setKey] = useState(formKey ?? '');
  const [description, setDescription] = useState('');
  const [nodes, setNodes] = useState<BuilderNode[]>(() => [createFieldNode('TEXT', 1)]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [titlePanelCollapsed, setTitlePanelCollapsed] = useState(false);
  const [inspectorPanelCollapsed, setInspectorPanelCollapsed] = useState(false);
  const [runtimePanelCollapsed, setRuntimePanelCollapsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publicationDraft, setPublicationDraft] = useState<PublicationDraft | null>(null);
  const [initializedFormId, setInitializedFormId] = useState<string | null>(null);

  const formsQuery = useQuery({
    queryKey: ['forms'],
    queryFn: listDynamicForms,
  });

  const optionSourcesQuery = useQuery({
    queryKey: ['forms', 'option-sources'],
    queryFn: () => listOptionSources(),
  });

  const currentGroup = formsQuery.data?.items.find((group) => group.key === formKey);
  const editableForm = currentGroup?.draft ?? currentGroup?.published ?? currentGroup?.latest ?? null;

  useEffect(() => {
    if (!editableForm || initializedFormId === editableForm.id) {
      return;
    }

    const mappedNodes = mapDefinitionToBuilderNodes(editableForm);
    setTitle(editableForm.title ?? '');
    setKey(editableForm.key ?? formKey ?? '');
    setDescription(editableForm.description ?? '');
    setNodes(mappedNodes);
    setSelectedNodeId(firstNodeId(mappedNodes));
    setInitializedFormId(editableForm.id);
  }, [editableForm, formKey, initializedFormId]);

  useEffect(() => {
    setKey(normalizeKey(title));
  }, [title]);

  useEffect(() => {
    if (!nodes.length) {
      return;
    }

    if (!selectedNodeId || !findNodeById(nodes, selectedNodeId)) {
      setSelectedNodeId(firstNodeId(nodes));
    }
  }, [nodes, selectedNodeId]);

  const fieldNodes = useMemo(() => flattenFieldNodes(nodes), [nodes]);
  const selectedNode = selectedNodeId ? findNodeById(nodes, selectedNodeId) : null;
  const payload = useMemo(
    () =>
      buildPayload({
        title,
        key,
        description,
        nodes,
      }),
    [description, key, nodes, title],
  );

  const saveMutation = useMutation({
    mutationFn: createDynamicForm,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate('/formularios', {
        replace: true,
        state: {
          updatedFormKey: response.item.key ?? key,
          updatedFormTitle: response.item.title,
          updatedFormStatus: response.item.status,
          updatedAt: response.item.updatedAt,
        },
      });
    },
  });

  const selectNode = (nodeId: string | null, options?: { collapseTitle?: boolean }) => {
    setSelectedNodeId(nodeId);

    if (options?.collapseTitle && nodeId) {
      setTitlePanelCollapsed(true);
    }
  };

  const addPresetToRoot = (presetId: string) => {
    setNodes((current) => {
      const nextNode = createNodeFromPreset(presetId, countNodes(current) + 1);
      return [...current, nextNode];
    });
  };

  const updateSelectedNode = (updater: (node: BuilderNode) => BuilderNode) => {
    if (!selectedNodeId) {
      return;
    }

    setNodes((current) => updateNodeInTree(current, selectedNodeId, updater));
  };

  const updateNode = (nodeId: string, updater: (node: BuilderNode) => BuilderNode) => {
    setNodes((current) => updateNodeInTree(current, nodeId, updater));
  };

  const moveRootNode = (nodeId: string, direction: -1 | 1) => {
    let didMove = false;

    setNodes((current) => {
      const index = current.findIndex((node) => node.id === nodeId);

      if (index === -1) {
        return current;
      }

      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      didMove = true;
      return reorderArray(current, index, nextIndex);
    });

    if (didMove) {
      selectNode(nodeId, { collapseTitle: true });
    }
  };

  const moveSectionChild = (sectionId: string, nodeId: string, direction: -1 | 1) => {
    let didMove = false;

    setNodes((current) =>
      updateSectionChildren(current, sectionId, (children) => {
        const index = children.findIndex((node) => node.id === nodeId);

        if (index === -1) {
          return children;
        }

        const nextIndex = index + direction;

        if (nextIndex < 0 || nextIndex >= children.length) {
          return children;
        }

        didMove = true;
        return reorderArray(children, index, nextIndex);
      }),
    );

    if (didMove) {
      selectNode(nodeId, { collapseTitle: true });
    }
  };

  const removeNode = (nodeId: string) => {
    setNodes((current) => {
      const result = removeNodeFromTree(current, nodeId);
      return result.nextNodes.length ? result.nextNodes : [createFieldNode('TEXT', 1)];
    });
  };

  const duplicateNode = (nodeId: string) => {
    setNodes((current) => {
      const result = duplicateNodeInTree(current, nodeId);
      return result.nextNodes;
    });
  };

  const applyDrop = async ({
    items,
    targetSectionId,
    targetKey,
    position,
  }: {
    items: DropItem[];
    targetSectionId: string | null;
    targetKey?: string;
    position?: 'before' | 'after';
  }) => {
    const dropPayloads = await decodeDropItems(items);

    applyDecodedDropPayloads(dropPayloads, targetSectionId, targetKey, position);
  };

  const applyDecodedDropPayloads = (
    dropPayloads: DragPayload[],
    targetSectionId: string | null,
    targetKey?: string,
    position?: 'before' | 'after',
  ) => {
    if (!dropPayloads.length) {
      return;
    }

    setNodes((current) => {
      let working = current;
      const nodesToInsert: BuilderNode[] = [];

      for (const dragPayload of dropPayloads) {
        if (dragPayload.source === 'library') {
          const nextNode = createNodeFromPreset(dragPayload.presetId, countNodes(working) + nodesToInsert.length + 1);

          if (targetSectionId && nextNode.kind === 'section') {
            continue;
          }

          nodesToInsert.push(nextNode);
          continue;
        }

        const removed = removeNodeFromTree(working, dragPayload.nodeId);

        if (!removed.removedNode) {
          continue;
        }

        if (targetSectionId && removed.removedNode.kind === 'section') {
          continue;
        }

        working = removed.nextNodes;
        nodesToInsert.push(removed.removedNode);
      }

      if (!nodesToInsert.length) {
        return current;
      }

      if (!targetSectionId) {
        return insertIntoList(working, nodesToInsert, targetKey, position);
      }

      const childNodes = nodesToInsert.filter((node): node is BuilderChildNode => node.kind !== 'section');
      if (!childNodes.length) {
        return working;
      }

      return updateSectionChildren(working, targetSectionId, (children) =>
        insertIntoList(children, childNodes, targetKey, position),
      );
    });
  };

  const rootDragAndDrop = useDragAndDrop<BuilderNode>({
    getItems(keys, items) {
      return items
        .filter((item) => keys.has(item.id))
        .map((item) => ({
          [BUILDER_DRAG_TYPE]: JSON.stringify({
            source: 'canvas',
            nodeId: item.id,
          } satisfies DragPayload),
          'text/plain': nodeSummary(item),
        }));
    },
    acceptedDragTypes: [BUILDER_DRAG_TYPE],
    getDropOperation: () => 'move',
    async onInsert(event) {
      await applyDrop({
        items: event.items,
        targetSectionId: null,
        targetKey: String(event.target.key),
        position: event.target.dropPosition === 'before' ? 'before' : 'after',
      });
    },
    async onRootDrop(event) {
      await applyDrop({
        items: event.items,
        targetSectionId: null,
      });
    },
    onReorder(event) {
      const movingIds = Array.from(event.keys).map(String);
      if (movingIds[0]) {
        selectNode(movingIds[0], { collapseTitle: true });
      }

      setNodes((current) =>
        reorderNodesInList(current, event.keys, String(event.target.key), event.target.dropPosition),
      );
    },
    renderDropIndicator(target) {
      return renderDropToken(target);
    },
  });

  const libraryDragAndDrop = useDragAndDrop<LibraryPreset>({
    getItems(keys, items) {
      return items
        .filter((item) => keys.has(item.id))
        .map((item) => ({
          [BUILDER_DRAG_TYPE]: JSON.stringify({
            source: 'library',
            presetId: item.id,
          } satisfies DragPayload),
          'text/plain': item.label,
        }));
    },
    getDropOperation: () => 'copy',
    renderDropIndicator(target) {
      return renderDropToken(target);
    },
  });

  const preparePublish = () => {
    setPublicationDraft({
      payload: {
        ...payload,
        status: 'ACTIVE',
      },
      title: payload.title,
      key: payload.key ?? '',
      version: publicationVersion(editableForm),
      summary: {
        totalBlocks: countNodes(nodes),
        totalFields: fieldNodes.length,
        totalSections: countNodesByKind(nodes, 'section'),
        withConditions: fieldNodes.filter((field) => field.visibleWhen || field.requiredWhen).length,
        withValidation: fieldNodes.filter((field) => field.required).length,
      },
    });
  };

  return (
    <main className="form-builder-page grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-1.5">
      <SectionCard className="flex flex-wrap items-center justify-between gap-1.5 p-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/formularios" className={cn(actionButtonClass, softButtonClass)}>
            <ArrowLeft size={13} />
            Voltar
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-[var(--admin-text-primary)]">
              Criador de formularios
            </p>
            <p className="truncate text-[10px] text-[var(--admin-text-secondary)]">
              Biblioteca por drag and drop, secoes e blocos.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={!fieldNodes.length}
            className={cn(actionButtonClass, softButtonClass)}
          >
            <Eye size={13} />
            Preview
          </button>
          <button
            type="button"
            onClick={() =>
              saveMutation.mutate({
                ...payload,
                status: 'DRAFT',
              })
            }
            disabled={saveMutation.isPending}
            className={cn(actionButtonClass, softButtonClass)}
          >
            <Save size={13} />
            Salvar rascunho
          </button>
          <button
            type="button"
            onClick={preparePublish}
            disabled={saveMutation.isPending}
            className={cn(actionButtonClass, primaryButtonClass)}
          >
            <UploadCloud size={13} />
            Publicar
          </button>
        </div>
      </SectionCard>

      <div className="grid min-h-0 gap-1.5 xl:grid-cols-[208px_minmax(0,1.62fr)_minmax(296px,0.88fr)]">
        <div className="admin-scrollbar min-h-0 overflow-x-hidden overflow-y-auto pr-1">
          <div className="grid min-w-0 gap-1.5">
            <SectionCard className="grid min-w-0 gap-1.5 p-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-[var(--admin-text-muted)]" />
                <p className="text-[10px] font-semibold text-[var(--admin-text-primary)]">Biblioteca</p>
              </div>
              <p className="text-[9px] leading-4 text-[var(--admin-text-secondary)]">
                Arraste para o canvas.
              </p>
              <ListBox
                aria-label="Biblioteca de blocos do formulario"
                items={libraryPresets}
                dragAndDropHooks={libraryDragAndDrop.dragAndDropHooks}
                className="form-builder-list grid min-w-0 gap-1.5 outline-none"
              >
                {(preset) => (
                  <ListBoxItem
                    id={preset.id}
                    textValue={preset.label}
                    className={builderListItemClassName}
                  >
                    <LibraryCard preset={preset} onQuickAdd={addPresetToRoot} />
                  </ListBoxItem>
                )}
              </ListBox>
            </SectionCard>

            <SectionCard className="grid gap-1.5 p-3">
              <p className="text-[11px] font-semibold text-[var(--admin-text-primary)]">Resumo</p>
              <SummaryItem label="Blocos" value={String(countNodes(nodes))} />
              <SummaryItem label="Campos" value={String(fieldNodes.length)} />
              <SummaryItem label="Secoes" value={String(countNodesByKind(nodes, 'section'))} />
              <SummaryItem label="Textos" value={String(countNodesByKind(nodes, 'content'))} />
            </SectionCard>
          </div>
        </div>

        <div className="admin-scrollbar min-h-0 overflow-x-hidden overflow-y-auto pr-1">
          <div className="grid min-w-0 gap-1.5">
            <SectionCard className="grid min-h-[500px] gap-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-1.5">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--admin-text-primary)]">Canvas</p>
                  <p className="text-[9px] text-[var(--admin-text-secondary)]">
                    Estrutura principal do formulario.
                  </p>
                </div>
              </div>
              <div className="flex min-h-[392px] flex-col gap-1.5 rounded-[6px] border border-dashed border-[var(--admin-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-2">
                <div className="rounded-[5px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-1)]/40 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
                    Solte os blocos aqui
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--admin-text-secondary)]">
                    Arraste da biblioteca para montar a estrutura na ordem desejada.
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <ListBox
                    key={`canvas-${selectedNodeId ?? 'none'}`}
                    aria-label="Canvas de blocos do formulario"
                    items={nodes}
                    dragAndDropHooks={rootDragAndDrop.dragAndDropHooks}
                    className="form-builder-list grid min-w-0 gap-1.5 outline-none"
                  >
                    {(node) => (
                      <ListBoxItem id={node.id} textValue={nodeSummary(node)} className={builderListItemClassName}>
                        <CanvasNodeCard
                          node={node}
                          selectedNodeId={selectedNodeId}
                          onSelect={selectNode}
                          onUpdateNode={updateNode}
                          onMoveRoot={moveRootNode}
                          onMoveSectionChild={moveSectionChild}
                          onDuplicate={duplicateNode}
                          onRemove={removeNode}
                          onDrop={applyDecodedDropPayloads}
                        />
                      </ListBoxItem>
                    )}
                  </ListBox>
                  {nodes.length ? (
                    <TrailingDropZone
                      label="Solte aqui para adicionar no final"
                      targetSectionId={null}
                      onDropPayloads={applyDecodedDropPayloads}
                      fillAvailableHeight
                    />
                  ) : null}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="admin-scrollbar min-h-0 overflow-x-hidden overflow-y-auto pr-1">
          <div className="grid min-w-0 gap-1.5">
            <SectionCard className="grid gap-2 p-3">
              <button
                type="button"
                onClick={() => setTitlePanelCollapsed((current) => !current)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <div>
                  <p className="text-[11px] font-semibold text-[var(--admin-text-primary)]">Titulo e contexto</p>
                  <p className="text-[9px] text-[var(--admin-text-secondary)]">
                    Identificacao, escopo atual e descricao do formulario.
                  </p>
                </div>
                <SectionToggleButton expanded={!titlePanelCollapsed} label="Alternar bloco de titulo" />
              </button>
              {!titlePanelCollapsed ? (
                <>
                  <div className="grid gap-2">
                    <FieldInput label="Titulo">
                      <input
                        aria-label="Titulo do formulario"
                        value={title}
                        onChange={(event) => setTitle(event.currentTarget.value)}
                        className={inputClass}
                        placeholder="Ex: Solicitacao de ferias"
                      />
                    </FieldInput>
                    <FieldInput label="Chave">
                      <div className="grid gap-2">
                        <input
                          aria-label="Chave do formulario"
                          value={key}
                          className={inputClass}
                          placeholder="solicitacao_ferias"
                          disabled
                        />
                        <p className="text-[9px] leading-4 text-[var(--admin-text-secondary)]">
                          Gerada automaticamente a partir do titulo. Fica oculta para edicao nesta fase para evitar inconsistencias.
                        </p>
                      </div>
                    </FieldInput>
                    <FieldInput label="Escopo">
                      <div className="grid gap-1 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2">
                        <p className="text-[10px] font-semibold text-[var(--admin-text-primary)]">Global</p>
                        <p className="text-[9px] leading-4 text-[var(--admin-text-secondary)]">
                          Nesta fase o formulario nasce global. Vinculos, escopos multiplos e responsavel de manutencao entram depois.
                        </p>
                      </div>
                    </FieldInput>
                    <FieldInput label="Descricao">
                      <textarea
                        aria-label="Descricao do formulario"
                        value={description}
                        onChange={(event) => setDescription(event.currentTarget.value)}
                        className={textareaClass}
                        placeholder="Contexto curto para administradores e setores."
                      />
                    </FieldInput>
                  </div>
                </>
              ) : null}
            </SectionCard>

            <SectionCard className="grid gap-2 p-3">
              <button
                type="button"
                onClick={() => setInspectorPanelCollapsed((current) => !current)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <div>
                  <p className="text-[11px] font-semibold text-[var(--admin-text-primary)]">Inspector</p>
                  <p className="text-[9px] text-[var(--admin-text-secondary)]">
                    {selectedNode ? 'Ajuste o bloco selecionado.' : 'Selecione um bloco no canvas.'}
                  </p>
                </div>
                <SectionToggleButton expanded={!inspectorPanelCollapsed} label="Alternar inspector" />
              </button>
              {!inspectorPanelCollapsed ? (
                selectedNode ? (
                  <NodeInspector
                    node={selectedNode}
                    allFieldNodes={fieldNodes.filter((field) => field.id !== selectedNode.id)}
                    optionSources={optionSourcesQuery.data?.items ?? []}
                    onChange={updateSelectedNode}
                  />
                ) : (
                  <div className="rounded-[5px] border border-dashed border-[var(--admin-border)] px-3 py-4 text-[11px] text-[var(--admin-text-secondary)]">
                    Nenhum bloco selecionado.
                  </div>
                )
              ) : null}
            </SectionCard>

            <SectionCard className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setRuntimePanelCollapsed((current) => !current)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--admin-text-primary)]">Runtime alvo</p>
                    <p className="text-[9px] text-[var(--admin-text-secondary)]">
                      O payload salva layout e runtime dos campos.
                    </p>
                  </div>
                  <SectionToggleButton expanded={!runtimePanelCollapsed} label="Alternar runtime" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className={cn(actionButtonClass, softButtonClass)}
                >
                  <Eye size={13} />
                  Abrir
                </button>
              </div>
              {!runtimePanelCollapsed ? (
                <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 text-[10px] text-[var(--admin-text-secondary)]">
                  <pre className="admin-scrollbar max-h-52 overflow-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(payload.schema, null, 2)}
                  </pre>
                </div>
              ) : null}
            </SectionCard>
          </div>
        </div>
      </div>

      {previewOpen ? (
        <PreviewDialog nodes={nodes} title={title || 'Preview do formulario'} onClose={() => setPreviewOpen(false)} />
      ) : null}

      {publicationDraft ? (
        <PublishConfirmDialog
          draft={publicationDraft}
          pending={saveMutation.isPending}
          error={saveMutation.error instanceof Error ? saveMutation.error.message : null}
          onClose={() => setPublicationDraft(null)}
          onConfirm={() => saveMutation.mutate(publicationDraft.payload)}
        />
      ) : null}
    </main>
  );
}

function LibraryCard({
  preset,
  onQuickAdd,
}: {
  preset: LibraryPreset;
  onQuickAdd: (presetId: string) => void;
}) {
  const Icon = preset.icon;

  return (
    <div className="grid min-w-0 cursor-grab gap-0.5 rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1.5 transition hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-3)] active:cursor-grabbing">
      <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-1.5">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)]">
          <Icon size={11} />
        </span>
        <div className="min-w-0 overflow-hidden">
          <p className="truncate text-[9.5px] font-semibold text-[var(--admin-text-primary)]">{preset.label}</p>
          <p className="truncate text-[8px] text-[var(--admin-text-secondary)]">{preset.description}</p>
        </div>
        <button
          type="button"
          aria-label={`Adicionar ${preset.label}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onQuickAdd(preset.id);
          }}
          className={cn(actionButtonClass, softButtonClass, 'h-5 w-5 px-0 text-[9px]')}
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

function CanvasNodeCard({
  node,
  selectedNodeId,
  onSelect,
  onUpdateNode,
  onMoveRoot,
  onMoveSectionChild,
  onDuplicate,
  onRemove,
  onDrop,
}: {
  node: BuilderNode;
  selectedNodeId: string | null;
  onSelect: (nodeId: string, options?: { collapseTitle?: boolean }) => void;
  onUpdateNode: (nodeId: string, updater: (node: BuilderNode) => BuilderNode) => void;
  onMoveRoot: (nodeId: string, direction: -1 | 1) => void;
  onMoveSectionChild: (sectionId: string, nodeId: string, direction: -1 | 1) => void;
  onDuplicate: (nodeId: string) => void;
  onRemove: (nodeId: string) => void;
  onDrop: (
    dropPayloads: DragPayload[],
    targetSectionId: string | null,
    targetKey?: string,
    position?: 'before' | 'after',
  ) => void | Promise<void>;
}) {
  if (node.kind === 'section') {
    return (
      <SectionCanvasCard
        node={node}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
        onUpdateNode={onUpdateNode}
        onMoveSectionChild={onMoveSectionChild}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onDrop={onDrop}
      />
    );
  }

  return (
    <SimpleNodeCard
      node={node}
      selected={selectedNodeId === node.id}
      onSelect={() => onSelect(node.id, { collapseTitle: true })}
      onMoveUp={() => onMoveRoot(node.id, -1)}
      onMoveDown={() => onMoveRoot(node.id, 1)}
      onDuplicate={() => onDuplicate(node.id)}
      onRemove={() => onRemove(node.id)}
    />
  );
}

function SectionCanvasCard({
  node,
  selectedNodeId,
  onSelect,
  onUpdateNode,
  onMoveSectionChild,
  onDuplicate,
  onRemove,
  onDrop,
}: {
  node: BuilderSectionNode;
  selectedNodeId: string | null;
  onSelect: (nodeId: string, options?: { collapseTitle?: boolean }) => void;
  onUpdateNode: (nodeId: string, updater: (node: BuilderNode) => BuilderNode) => void;
  onMoveSectionChild: (sectionId: string, nodeId: string, direction: -1 | 1) => void;
  onDuplicate: (nodeId: string) => void;
  onRemove: (nodeId: string) => void;
  onDrop: (
    dropPayloads: DragPayload[],
    targetSectionId: string | null,
    targetKey?: string,
    position?: 'before' | 'after',
  ) => void | Promise<void>;
}) {
  return (
    <div
      data-node-card={node.id}
      data-selected={selectedNodeId === node.id ? 'true' : 'false'}
      data-visual-selected={selectedNodeId === node.id ? 'true' : 'false'}
      onPointerDownCapture={() => onSelect(node.id, { collapseTitle: true })}
      onClickCapture={() => onSelect(node.id, { collapseTitle: true })}
      onClick={() => onSelect(node.id, { collapseTitle: true })}
      className={cn(
        'grid min-w-0 gap-1.5 rounded-[5px] border p-2 transition',
        selectedNodeId === node.id
          ? 'border-[var(--admin-border-strong)] bg-[var(--admin-surface-3)]'
          : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]',
      )}
      style={selectedNodeId === node.id ? selectedCanvasCardStyle : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(node.id, { collapseTitle: true })}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-1.5 text-left outline-none"
        >
          <span className="inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] active:cursor-grabbing">
            <LayoutPanelTop size={13} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-[var(--admin-text-primary)]">
              {node.title.trim() || 'Secao sem titulo'}
            </p>
            <p className="truncate text-[9px] text-[var(--admin-text-secondary)]">
              {node.columns} coluna(s) • {node.children.length} bloco(s)
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <SectionColumnsSelect
            value={node.columns}
            ariaLabel="Colunas da secao no canvas"
            compact
            onChange={(value) => {
              onUpdateNode(node.id, (current) => (current.kind === 'section' ? { ...current, columns: value } : current));
              onSelect(node.id, { collapseTitle: true });
            }}
          />
          <IconAction label="Duplicar secao" onClick={() => onDuplicate(node.id)}>
            <Copy size={12} />
          </IconAction>
          <IconAction label="Excluir secao" onClick={() => onRemove(node.id)}>
            <Trash2 size={12} />
          </IconAction>
        </div>
      </div>

      {node.description.trim() ? (
        <p className="text-[10px] leading-4.5 text-[var(--admin-text-secondary)]">{node.description}</p>
      ) : null}

      <div className="grid gap-1.5 rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-1.5">
        {node.children.length ? (
          <div className={cn('grid gap-1.5', sectionGridClass(node.columns))}>
            {node.children.map((child) => (
              <div key={child.id} className="min-w-0">
                <SimpleNodeCard
                  node={child}
                  selected={selectedNodeId === child.id}
                  onSelect={() => onSelect(child.id, { collapseTitle: true })}
                  onMoveUp={() => onMoveSectionChild(node.id, child.id, -1)}
                onMoveDown={() => onMoveSectionChild(node.id, child.id, 1)}
                onDuplicate={() => onDuplicate(child.id)}
                  onRemove={() => onRemove(child.id)}
                  compact
                />
              </div>
            ))}
          </div>
        ) : null}
        {node.children.length ? (
          <TrailingDropZone
            label="Solte aqui para manter no fim da secao"
            targetSectionId={node.id}
            onDropPayloads={onDrop}
            compact
          />
        ) : null}
        {!node.children.length ? (
          <TrailingDropZone
            label="Solte aqui para preencher a secao"
            targetSectionId={node.id}
            onDropPayloads={onDrop}
            compact
          />
        ) : null}
      </div>
    </div>
  );
}

function SimpleNodeCard({
  node,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  compact = false,
}: {
  node: BuilderFieldNode | BuilderContentNode;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const title = node.kind === 'field' ? node.label.trim() || 'Campo sem rotulo' : node.title.trim() || 'Texto';
  const meta =
    node.kind === 'field'
      ? `${normalizeKey(node.code || node.label)} • ${fieldTypeLabel(node.fieldType)}`
      : 'Conteudo readonly';
  const hasVisibilityCondition = node.kind === 'field' && Boolean(node.visibleWhen);
  const hasRequiredCondition = node.kind === 'field' && Boolean(node.requiredWhen);
  const hasAlwaysRequired = node.kind === 'field' && node.required;
  const hasSensitiveFlag = node.kind === 'field' && node.sensitive;

  return (
    <div
      data-node-card={node.id}
      data-selected={selected ? 'true' : 'false'}
      data-visual-selected={selected ? 'true' : 'false'}
      onPointerDownCapture={onSelect}
      onClickCapture={onSelect}
      onClick={onSelect}
      className={cn(
        'grid min-w-0 cursor-grab gap-1.5 rounded-[5px] border text-left transition active:cursor-grabbing',
        compact ? 'p-2' : 'p-2.5',
        selected
          ? 'border-[var(--admin-border-strong)] bg-[var(--admin-surface-3)]'
          : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] hover:bg-[var(--admin-surface-1)]',
      )}
      style={selected ? selectedCanvasCardStyle : undefined}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <button
          type="button"
          onClick={onSelect}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-1.5 text-left outline-none"
        >
          <span className="inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-muted)] active:cursor-grabbing">
            {node.kind === 'field' ? <GripVertical size={12} /> : <Type size={12} />}
          </span>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-[var(--admin-text-primary)]">{title}</p>
              <p className="truncate text-[9px] text-[var(--admin-text-secondary)]">{meta}</p>
            </div>
            {node.kind === 'field' ? (
              <ConditionStatusIcons
                hasAlwaysRequired={hasAlwaysRequired}
                hasSensitiveFlag={hasSensitiveFlag}
                hasVisibilityCondition={hasVisibilityCondition}
                hasRequiredCondition={hasRequiredCondition}
              />
            ) : null}
          </div>
        </button>
      </div>

      {node.kind === 'content' ? (
        <p className="line-clamp-2 text-[9px] leading-4 text-[var(--admin-text-secondary)]">
          {node.content.trim() || 'Mensagem readonly para orientar o colaborador.'}
        </p>
      ) : null}

      <div className="grid grid-cols-4 gap-1 pt-0.5" onClick={(event) => event.stopPropagation()}>
        <IconAction label="Mover acima" onClick={onMoveUp}>
          <ChevronUp size={12} />
        </IconAction>
        <IconAction label="Mover abaixo" onClick={onMoveDown}>
          <ChevronDown size={12} />
        </IconAction>
        <IconAction label="Duplicar bloco" onClick={onDuplicate}>
          <Copy size={12} />
        </IconAction>
        <IconAction label="Excluir bloco" onClick={onRemove}>
          <Trash2 size={12} />
        </IconAction>
      </div>
    </div>
  );
}

function ConditionStatusIcons({
  hasAlwaysRequired,
  hasSensitiveFlag,
  hasVisibilityCondition,
  hasRequiredCondition,
}: {
  hasAlwaysRequired: boolean;
  hasSensitiveFlag: boolean;
  hasVisibilityCondition: boolean;
  hasRequiredCondition: boolean;
}) {
  if (!hasAlwaysRequired && !hasSensitiveFlag && !hasVisibilityCondition && !hasRequiredCondition) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {hasAlwaysRequired ? (
        <span
          aria-label="Campo obrigatorio sempre"
          title="Obrigatorio sempre"
          className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)]"
        >
          <Lock size={10} />
        </span>
      ) : null}
      {hasSensitiveFlag ? (
        <span
          aria-label="Campo sensivel"
          title="Campo sensivel"
          className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] text-[var(--admin-warning-text)]"
        >
          <ShieldAlert size={10} />
        </span>
      ) : null}
      {hasVisibilityCondition ? (
        <span
          aria-label="Campo com visibilidade condicional"
          title="Visibilidade condicional"
          className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)]"
        >
          <Eye size={10} />
        </span>
      ) : null}
      {hasRequiredCondition ? (
        <span
          aria-label="Campo com obrigatoriedade condicional"
          title="Obrigatoriedade condicional"
          className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-accent-text)]"
        >
          <Asterisk size={10} />
        </span>
      ) : null}
    </div>
  );
}

function NodeInspector({
  node,
  allFieldNodes,
  optionSources,
  onChange,
}: {
  node: BuilderNode;
  allFieldNodes: BuilderFieldNode[];
  optionSources: OptionSourceSummary[];
  onChange: (updater: (node: BuilderNode) => BuilderNode) => void;
}) {
  if (node.kind === 'section') {
    return (
      <SectionInspector
        node={node}
        onChange={(updater) => onChange((current) => (current.kind === 'section' ? updater(current) : current))}
      />
    );
  }

  if (node.kind === 'content') {
    return (
      <ContentInspector
        node={node}
        onChange={(updater) => onChange((current) => (current.kind === 'content' ? updater(current) : current))}
      />
    );
  }

  return (
    <FieldInspector
      node={node}
      allFieldNodes={allFieldNodes}
      optionSources={optionSources}
      onChange={(updater) => onChange((current) => (current.kind === 'field' ? updater(current) : current))}
    />
  );
}

function SectionInspector({
  node,
  onChange,
}: {
  node: BuilderSectionNode;
  onChange: (updater: (node: BuilderSectionNode) => BuilderSectionNode) => void;
}) {
  return (
    <div className="grid gap-3">
      <FieldInput label="Titulo">
        <input
          aria-label="Titulo secao"
          value={node.title}
          onChange={(event) => {
            const nextTitle = event.currentTarget.value;
            onChange((current) => ({ ...current, title: nextTitle }));
          }}
          className={inputClass}
          placeholder="Ex: Dados do reembolso"
        />
      </FieldInput>
      <FieldInput label="Descricao">
        <textarea
          aria-label="Descricao secao"
          value={node.description}
          onChange={(event) => {
            const nextDescription = event.currentTarget.value;
            onChange((current) => ({ ...current, description: nextDescription }));
          }}
          className={textareaClass}
          placeholder="Oriente o agrupamento sem poluir."
        />
      </FieldInput>
      <FieldInput label="Colunas">
        <SectionColumnsSelect
          value={node.columns}
          ariaLabel="Colunas da secao no inspetor"
          onChange={(value) => onChange((current) => ({ ...current, columns: value }))}
        />
      </FieldInput>
    </div>
  );
}

function ContentInspector({
  node,
  onChange,
}: {
  node: BuilderContentNode;
  onChange: (updater: (node: BuilderContentNode) => BuilderContentNode) => void;
}) {
  return (
    <div className="grid gap-3">
      <FieldInput label="Titulo">
        <input
          aria-label="Titulo texto"
          value={node.title}
          onChange={(event) => {
            const nextTitle = event.currentTarget.value;
            onChange((current) => ({ ...current, title: nextTitle }));
          }}
          className={inputClass}
          placeholder="Ex: Antes de continuar"
        />
      </FieldInput>
      <FieldInput label="Conteudo">
        <textarea
          aria-label="Conteudo texto"
          value={node.content}
          onChange={(event) => {
            const nextContent = event.currentTarget.value;
            onChange((current) => ({ ...current, content: nextContent }));
          }}
          className={textareaClass}
          placeholder="Mensagem readonly para orientar o colaborador."
        />
      </FieldInput>
    </div>
  );
}

function FieldInspector({
  node,
  allFieldNodes,
  optionSources,
  onChange,
}: {
  node: BuilderFieldNode;
  allFieldNodes: BuilderFieldNode[];
  optionSources: OptionSourceSummary[];
  onChange: (updater: (node: BuilderFieldNode) => BuilderFieldNode) => void;
}) {
  return (
    <div className="grid gap-3">
      <FieldInput label="Rotulo">
        <input
          aria-label="Rotulo campo"
          value={node.label}
          onChange={(event) => {
            const nextLabel = event.currentTarget.value;
            onChange((current) => ({
              ...current,
              label: nextLabel,
              code: current.codeMode === 'AUTO' ? normalizeKey(nextLabel) : current.code,
            }));
          }}
          className={inputClass}
          placeholder="Ex: Data inicial"
        />
      </FieldInput>
      <FieldInput label="Codigo">
        <div className="grid gap-2">
          <input
            aria-label="Codigo campo"
            value={node.code}
            className={inputClass}
            placeholder="data_inicial"
            disabled
          />
          <p className="text-[9px] leading-4 text-[var(--admin-text-secondary)]">
            Gerado automaticamente a partir do rotulo e atualizado junto com ele.
          </p>
        </div>
      </FieldInput>
      <FieldInput label="Tipo">
        <select
          aria-label="Tipo campo"
          value={node.fieldType}
          onChange={(event) => {
            const nextType = event.currentTarget.value as SupportFormFieldType;
            onChange((current) => ({
              ...current,
              fieldType: nextType,
              optionsText: nextType === 'SELECT' ? current.optionsText || 'Opcao 1\nOpcao 2' : '',
              optionsMode: nextType === 'SELECT' ? current.optionsMode : 'MANUAL',
              optionSourceKey: nextType === 'SELECT' ? current.optionSourceKey : '',
            }));
          }}
          className={inputClass}
        >
          {libraryPresets
            .filter((preset) => preset.kind === 'field')
            .map((preset) => (
              <option key={preset.id} value={preset.fieldType}>
                {preset.label}
              </option>
            ))}
        </select>
      </FieldInput>
      <p className="text-[10px] leading-4 text-[var(--admin-text-secondary)]">
        Escolha como este campo exige preenchimento: sempre ou somente quando uma condicao for atendida.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <FieldToggle
          label="Obrigatorio sempre"
          checked={node.required}
          onChange={(checked) =>
            onChange((current) => ({
              ...current,
              required: checked,
              requiredWhen: checked ? null : current.requiredWhen,
            }))
          }
        />
        <FieldToggle
          label="Sensivel"
          checked={node.sensitive}
          onChange={(checked) => onChange((current) => ({ ...current, sensitive: checked }))}
        />
      </div>
      <FieldInput label="Ajuda">
        <textarea
          aria-label="Ajuda campo"
          value={node.helpText}
          onChange={(event) => {
            const nextHelpText = event.currentTarget.value;
            onChange((current) => ({ ...current, helpText: nextHelpText }));
          }}
          className={textareaClass}
          placeholder="Mensagem curta abaixo do campo."
        />
      </FieldInput>
      {node.fieldType === 'SELECT' ? (
        <div className="grid gap-3">
          <FieldInput label="Origem das opcoes">
            <select
              aria-label="Origem das opcoes campo"
              value={node.optionsMode}
              onChange={(event) => {
                const nextMode = event.currentTarget.value as SelectOptionsMode;
                onChange((current) => ({
                  ...current,
                  optionsMode: nextMode,
                  optionSourceKey: nextMode === 'REMOTE' ? current.optionSourceKey : '',
                }));
              }}
              className={inputClass}
            >
              <option value="MANUAL">Lista manual</option>
              <option value="REMOTE">Fonte remota</option>
            </select>
          </FieldInput>
          {node.optionsMode === 'REMOTE' ? (
            <FieldInput label="Fonte">
              <select
                aria-label="Fonte remota campo"
                value={node.optionSourceKey}
                onChange={(event) => {
                  const nextSourceKey = event.currentTarget.value;
                  onChange((current) => ({ ...current, optionSourceKey: nextSourceKey }));
                }}
                className={inputClass}
              >
                <option value="">Selecione uma fonte cadastrada</option>
                {optionSources.map((source) => (
                  <option key={source.key} value={source.key}>
                    {source.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[9px] leading-4 text-[var(--admin-text-secondary)]">
                Endpoint e credenciais ficam protegidos no backend.
              </p>
            </FieldInput>
          ) : (
            <FieldInput label="Opcoes">
              <textarea
                aria-label="Opcoes campo"
                value={node.optionsText}
                onChange={(event) => {
                  const nextOptionsText = event.currentTarget.value;
                  onChange((current) => ({ ...current, optionsText: nextOptionsText }));
                }}
                className={textareaClass}
                placeholder={'Uma opcao por linha\nEx: Sim\nNao'}
              />
            </FieldInput>
          )}
        </div>
      ) : null}
      <ConditionEditor
        title="Visibilidade condicional"
        availableFields={allFieldNodes}
        value={node.visibleWhen}
        onChange={(nextValue) => onChange((current) => ({ ...current, visibleWhen: nextValue }))}
      />
      <ConditionEditor
        title="Obrigatorio quando"
        availableFields={allFieldNodes}
        value={node.requiredWhen}
        onChange={(nextValue) =>
          onChange((current) => ({
            ...current,
            required: nextValue ? false : current.required,
            requiredWhen: nextValue,
          }))
        }
      />
    </div>
  );
}

function ConditionEditor({
  title,
  availableFields,
  value,
  onChange,
}: {
  title: string;
  availableFields: BuilderFieldNode[];
  value: BuilderConditionGroup | null;
  onChange: (value: BuilderConditionGroup | null) => void;
}) {
  const enabled = Boolean(value);
  const group = value ?? { mode: 'all' as const, clauses: [createCondition()] };

  return (
    <div className="grid gap-3 rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
            {title}
          </p>
          <p className="text-[10px] text-[var(--admin-text-secondary)]">
            Reage a campos do mesmo formulario.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-[var(--admin-text-primary)]">
          <input
            type="checkbox"
            checked={enabled}
            aria-label={`${title} ativar`}
            onChange={(event) => onChange(event.currentTarget.checked ? group : null)}
          />
          Ativar
        </label>
      </div>
      {enabled ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              aria-label={`${title} combinacao`}
              value={group.mode}
              onChange={(event) =>
                onChange({
                  ...group,
                  mode: event.currentTarget.value as ConditionMode,
                })
              }
              className={cn(inputClass, 'h-8 max-w-[160px] px-2 text-[11px]')}
            >
              <option value="all">Todas</option>
              <option value="any">Qualquer</option>
            </select>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...group,
                  clauses: [...group.clauses, createCondition()],
                })
              }
              className={cn(actionButtonClass, softButtonClass)}
            >
              <Plus size={12} />
              Condicao
            </button>
          </div>
          <div className="grid gap-2">
            {group.clauses.map((condition) => (
              <ConditionClauseEditor
                key={condition.id}
                title={title}
                condition={condition}
                availableFields={availableFields}
                onChange={(nextCondition) =>
                  onChange({
                    ...group,
                    clauses: group.clauses.map((clause) => (clause.id === condition.id ? nextCondition : clause)),
                  })
                }
                onRemove={() =>
                  onChange({
                    ...group,
                    clauses:
                      group.clauses.length === 1
                        ? [createCondition()]
                        : group.clauses.filter((clause) => clause.id !== condition.id),
                  })
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ConditionClauseEditor({
  title,
  condition,
  availableFields,
  onChange,
  onRemove,
}: {
  title: string;
  condition: BuilderCondition;
  availableFields: BuilderFieldNode[];
  onChange: (condition: BuilderCondition) => void;
  onRemove: () => void;
}) {
  const selectedField = availableFields.find((candidate) => normalizeKey(candidate.code) === normalizeKey(condition.fieldCode)) ?? null;
  const selectedFieldType = selectedField?.fieldType ?? 'TEXT';
  const operatorOptions = conditionOperatorOptions(selectedFieldType);
  const safeOperator = operatorOptions.some((option) => option.value === condition.operator)
    ? condition.operator
    : operatorOptions[0]?.value ?? 'equals';

  useEffect(() => {
    if (safeOperator !== condition.operator) {
      onChange(normalizeConditionForField(condition, selectedFieldType, safeOperator));
    }
  }, [condition, onChange, safeOperator, selectedFieldType]);

  return (
    <div className="grid min-w-0 gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2">
      <div className="flex justify-end">
        <button
          type="button"
          aria-label={`Remover condicao ${title}`}
          onClick={onRemove}
          className={cn(actionButtonClass, dangerButtonClass, 'h-7 min-w-7 px-0')}
        >
          <X size={12} />
        </button>
      </div>
      <div className="grid min-w-0 gap-2">
        <select
          aria-label={`${title} campo`}
          value={condition.fieldCode}
          onChange={(event) => {
            const nextFieldCode = event.currentTarget.value;
            const nextField =
              availableFields.find((candidate) => normalizeKey(candidate.code) === normalizeKey(nextFieldCode)) ?? null;
            const nextType = nextField?.fieldType ?? 'TEXT';
            const nextOperator = conditionOperatorOptions(nextType)[0]?.value ?? 'equals';

            onChange(
              normalizeConditionForField(
                {
                  ...condition,
                  fieldCode: nextFieldCode,
                  operator: nextOperator,
                },
                nextType,
                nextOperator,
              ),
            );
          }}
          className={cn(inputClass, 'min-w-0 h-8 w-full px-2 text-[11px]')}
        >
          <option value="">Selecionar campo</option>
          {availableFields.map((candidate) => (
            <option key={candidate.id} value={normalizeKey(candidate.code)}>
              {candidate.label || candidate.code}
            </option>
          ))}
        </select>
        <select
          aria-label={`${title} operador`}
          value={safeOperator}
          onChange={(event) =>
            onChange(
              normalizeConditionForField(
                {
                  ...condition,
                  operator: event.currentTarget.value as ConditionOperator,
                },
                selectedFieldType,
                event.currentTarget.value as ConditionOperator,
              ),
            )
          }
          className={cn(inputClass, 'min-w-0 h-8 w-full px-2 text-[11px]')}
        >
          {operatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <ConditionValueInput
        title={title}
        condition={condition}
        selectedField={selectedField}
        operator={safeOperator}
        onChange={onChange}
      />
    </div>
  );
}

function ConditionValueInput({
  title,
  condition,
  selectedField,
  operator,
  onChange,
}: {
  title: string;
  condition: BuilderCondition;
  selectedField: BuilderFieldNode | null;
  operator: ConditionOperator;
  onChange: (condition: BuilderCondition) => void;
}) {
  if (operator === 'exists') {
    return (
      <div className="flex min-w-0 h-8 w-full items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[11px] text-[var(--admin-text-muted)]">
        Sem valor adicional
      </div>
    );
  }

  if (!selectedField) {
    return (
      <input
        aria-label={`${title} valor`}
        value={operator === 'in' ? condition.valuesText : condition.value}
        onChange={(event) =>
          onChange(
            operator === 'in'
              ? { ...condition, valuesText: event.currentTarget.value }
              : { ...condition, value: event.currentTarget.value },
          )
        }
        className={cn(inputClass, 'min-w-0 h-8 w-full px-2 text-[11px]')}
        placeholder={operator === 'in' ? 'valor_a, valor_b' : 'Valor esperado'}
      />
    );
  }

  if (selectedField.fieldType === 'BOOLEAN') {
    const items = [
      { id: 'true', label: 'Sim' },
      { id: 'false', label: 'Nao' },
    ];

    return (
      <select
        aria-label={`${title} valor`}
        value={condition.value}
        onChange={(event) => onChange({ ...condition, value: event.currentTarget.value })}
        className={cn(inputClass, 'min-w-0 h-8 w-full px-2 text-[11px]')}
      >
        <option value="">Selecionar valor</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    );
  }

  if (selectedField.fieldType === 'SELECT') {
    const options = parseOptions(selectedField.optionsText);

    if (operator === 'in') {
      return (
        <input
          aria-label={`${title} valor`}
          value={condition.valuesText}
          onChange={(event) => onChange({ ...condition, valuesText: event.currentTarget.value })}
          className={cn(inputClass, 'min-w-0 h-8 w-full px-2 text-[11px]')}
          placeholder={options.length ? options.join(', ') : 'valor_a, valor_b'}
        />
      );
    }

    return (
      <select
        aria-label={`${title} valor`}
        value={condition.value}
        onChange={(event) => onChange({ ...condition, value: event.currentTarget.value })}
        className={cn(inputClass, 'min-w-0 h-8 w-full px-2 text-[11px]')}
      >
        <option value="">Selecionar valor</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (selectedField.fieldType === 'DATE') {
    return (
      <DatePicker
        aria-label={`${title} valor`}
        value={condition.value || null}
        onChange={(value) => onChange({ ...condition, value: value ?? '' })}
      />
    );
  }

  if (selectedField.fieldType === 'NUMBER') {
    const numericValue = condition.value.trim() === '' ? undefined : Number(condition.value);

    return (
      <NumberField
        aria-label={`${title} valor`}
        value={Number.isFinite(numericValue) ? numericValue : undefined}
        onChange={(value) => onChange({ ...condition, value: value == null ? '' : String(value) })}
      />
    );
  }

  return (
    <input
      aria-label={`${title} valor`}
      value={operator === 'in' ? condition.valuesText : condition.value}
      onChange={(event) =>
        onChange(
          operator === 'in'
            ? { ...condition, valuesText: event.currentTarget.value }
            : { ...condition, value: event.currentTarget.value },
        )
      }
      className={cn(inputClass, 'min-w-0 h-8 w-full px-2 text-[11px]')}
      placeholder={operator === 'in' ? 'valor_a, valor_b' : 'Valor esperado'}
    />
  );
}

function PreviewDialog({
  nodes,
  title,
  onClose,
}: {
  nodes: BuilderNode[];
  title: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4">
      <SectionCard className="grid max-h-[90vh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
          <div>
            <h2 className="text-[12px] font-semibold text-[var(--admin-text-primary)]">Preview interativo</h2>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">{title}</p>
          </div>
          <button type="button" onClick={onClose} className={cn(actionButtonClass, softButtonClass)}>
            <X size={13} />
            Fechar
          </button>
        </div>
        <div className="admin-scrollbar overflow-auto p-4">
          <div className="mx-auto max-w-4xl rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
            <div className="grid gap-3">
              {nodes.map((node) => (
                <PreviewNode key={node.id} node={node} formData={formData} onChange={setFormData} />
              ))}
              <div className="flex justify-end pt-2">
                <button type="button" className={cn(actionButtonClass, primaryButtonClass)}>
                  Validar
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function PreviewNode({
  node,
  formData,
  onChange,
}: {
  node: BuilderNode;
  formData: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  if (node.kind === 'content') {
    return (
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3">
        <p className="text-[11px] font-semibold text-[var(--admin-text-primary)]">{node.title.trim() || 'Texto'}</p>
        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[var(--admin-text-secondary)]">
          {node.content.trim() || 'Mensagem readonly sem conteudo configurado.'}
        </p>
      </div>
    );
  }

  if (node.kind === 'section') {
    return (
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3">
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-[var(--admin-text-primary)]">{node.title.trim() || 'Secao'}</p>
          {node.description.trim() ? (
            <p className="mt-1 text-[11px] text-[var(--admin-text-secondary)]">{node.description}</p>
          ) : null}
        </div>
        <div className={cn('grid gap-3', sectionGridClass(node.columns))}>
          {node.children.map((child) => (
            <PreviewNode key={child.id} node={child} formData={formData} onChange={onChange} />
          ))}
        </div>
      </div>
    );
  }

  const visible = node.visibleWhen ? evaluateConditionGroup(node.visibleWhen, formData) : true;

  if (!visible) {
    return null;
  }

  const code = normalizeKey(node.code || node.label);
  const required = node.required || evaluateConditionGroup(node.requiredWhen, formData);
  const value = formData[code];

  return (
    <div className="grid gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
        {node.label || 'Campo'} {required ? '*' : ''}
      </label>
      <PreviewFieldInput
        node={node}
        value={value}
        onChange={(nextValue) => onChange({ ...formData, [code]: nextValue })}
      />
      {node.helpText.trim() ? (
        <p className="text-[11px] text-[var(--admin-text-secondary)]">{node.helpText.trim()}</p>
      ) : null}
    </div>
  );
}

function PreviewFieldInput({
  node,
  value,
  onChange,
}: {
  node: BuilderFieldNode;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const remoteOptionsQuery = useQuery({
    queryKey: ['forms', 'option-source', node.optionSourceKey],
    queryFn: () => queryOptionSource(node.optionSourceKey, { limit: 100 }),
    enabled: node.fieldType === 'SELECT' && node.optionsMode === 'REMOTE' && Boolean(node.optionSourceKey),
    staleTime: 60_000,
  });

  if (node.fieldType === 'TEXTAREA') {
    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={textareaClass}
      />
    );
  }

  if (node.fieldType === 'SELECT') {
    const options = node.optionsMode === 'REMOTE'
      ? (remoteOptionsQuery.data?.items ?? []).map((option) => ({ id: option.value, label: option.label }))
      : parseOptions(node.optionsText).map((option) => ({ id: option, label: option }));

    return (
      <SelectField
        aria-label={node.label || 'Campo de selecao'}
        items={options}
        placeholder="Selecione"
        selectedKey={typeof value === 'string' && value ? value : null}
        onSelectionChange={(key) => onChange(key ? String(key) : '')}
      />
    );
  }

  if (node.fieldType === 'BOOLEAN') {
    return (
      <label className="flex h-9 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[12px] text-[var(--admin-text-primary)]">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />
        Confirmado
      </label>
    );
  }

  if (node.fieldType === 'FILE') {
    return (
      <input
        type="file"
        className="block h-9 w-full rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-1.5 text-[12px] text-[var(--admin-text-primary)] file:mr-3 file:rounded-[4px] file:border-0 file:bg-[var(--admin-panel-active)] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-[var(--admin-text-primary)]"
        onChange={(event) => onChange(event.currentTarget.files?.[0]?.name ?? '')}
      />
    );
  }

  if (node.fieldType === 'DATE') {
    return (
      <DatePicker
        aria-label={node.label || 'Campo de data'}
        value={typeof value === 'string' ? value : null}
        onChange={onChange}
      />
    );
  }

  if (node.fieldType === 'NUMBER') {
    return (
      <NumberField
        aria-label={node.label || 'Campo numerico'}
        value={typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : undefined}
        onChange={onChange}
      />
    );
  }

  return (
    <input
      type="text"
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      onChange={(event) => onChange(event.currentTarget.value)}
      className={inputClass}
    />
  );
}

function PublishConfirmDialog({
  draft,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  draft: PublicationDraft;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4">
      <SectionCard className="grid w-full max-w-lg gap-3 p-4">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--admin-text-primary)]">Confirmar publicacao</h2>
          <p className="mt-1 text-[11px] text-[var(--admin-text-secondary)]">
            Revise o resumo antes de tornar esta versao a referencia ativa.
          </p>
        </div>
        <div className="grid gap-2 rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 text-[11px] text-[var(--admin-text-secondary)]">
          <SummaryItem label="Formulario" value={draft.title} />
          <SummaryItem label="Chave" value={draft.key || 'Nova chave'} />
          <SummaryItem label="Origem" value={draft.version.from} />
          <SummaryItem label="Destino" value={draft.version.to} />
          <SummaryItem label="Blocos" value={String(draft.summary.totalBlocks)} />
          <SummaryItem label="Campos" value={String(draft.summary.totalFields)} />
          <SummaryItem label="Secoes" value={String(draft.summary.totalSections)} />
          <SummaryItem label="Com condicoes" value={String(draft.summary.withConditions)} />
          <SummaryItem label="Com validacao base" value={String(draft.summary.withValidation)} />
        </div>
        {error ? (
          <div className="rounded-[5px] border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] px-3 py-2 text-[11px] text-[var(--admin-danger-text)]">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={cn(actionButtonClass, softButtonClass)}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(actionButtonClass, primaryButtonClass)}
          >
            Confirmar publicacao
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function renderDropToken(target: { type: 'root' | 'item'; dropPosition?: 'before' | 'after' | 'on'; key?: string | number }) {
  if (target.type === 'root') {
    return <div aria-hidden="true" className="h-0" />;
  }

  const itemTarget = {
    type: 'item' as const,
    key: target.key ?? '',
    dropPosition: target.dropPosition ?? 'after',
  };

  return (
    <DropIndicator
      target={itemTarget}
      className={({ isDropTarget }) =>
        cn('mx-1 h-2 rounded-[999px] transition', isDropTarget ? 'bg-[var(--admin-border-strong)]' : 'bg-transparent')
      }
    />
  );
}

function SectionColumnsSelect({
  value,
  onChange,
  ariaLabel,
  compact = false,
}: {
  value: SectionColumns;
  onChange: (value: SectionColumns) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('relative min-w-0', compact ? 'w-[84px]' : 'w-full')}>
      <select
        aria-label={ariaLabel}
        value={String(value)}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(Number(event.currentTarget.value) as SectionColumns)}
        className={cn(inputClass, compact ? 'h-7 pr-6 pl-2 text-[10px] font-semibold' : 'pr-8')}
      >
        <option value="1">1 coluna</option>
        <option value="2">2 colunas</option>
        <option value="3">3 colunas</option>
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 inline-flex items-center text-[var(--admin-text-muted)]">
        <ChevronDown size={12} />
      </span>
    </div>
  );
}

function FieldInput({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-9 items-center justify-between gap-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[11px] text-[var(--admin-text-primary)]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">{label}</span>
      <span className="text-right text-[11px] font-semibold text-[var(--admin-text-primary)]">{value}</span>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 min-w-0 w-full items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text-primary)]"
    >
      {children}
    </button>
  );
}

function SectionToggleButton({ expanded, label }: { expanded: boolean; label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition"
    >
      {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </span>
  );
}

function TrailingDropZone({
  label,
  targetSectionId,
  onDropPayloads,
  compact = false,
  fillAvailableHeight = false,
}: {
  label: string;
  targetSectionId: string | null;
  onDropPayloads: (
    dropPayloads: DragPayload[],
    targetSectionId: string | null,
    targetKey?: string,
    position?: 'before' | 'after',
  ) => void | Promise<void>;
  compact?: boolean;
  fillAvailableHeight?: boolean;
}) {
  const [active, setActive] = useState(false);

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasBuilderDragPayload(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (!active) {
      setActive(true);
    }
  };

  const handleDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasBuilderDragPayload(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setActive(false);

    const payload = decodeNativeDragPayload(event.dataTransfer);
    if (!payload) {
      return;
    }

    await onDropPayloads([payload], targetSectionId);
  };

  return (
    <div
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
      className={cn(
        'mt-1.5 flex min-h-0 rounded-[5px] transition',
        fillAvailableHeight ? 'flex-1 items-stretch' : 'items-end',
        compact ? 'pt-1.5' : 'pt-2',
      )}
    >
      <div
        className={cn(
          'flex w-full items-center justify-center rounded-[4px] border border-dashed px-2.5 text-center text-[10px] transition',
          fillAvailableHeight ? 'min-h-full flex-1' : 'min-h-14',
          active
            ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
            : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]/18 text-[var(--admin-text-secondary)]',
        )}
      >
        {label}
      </div>
    </div>
  );
}

function builderListItemClassName() {
  return 'rounded-[5px] border border-transparent bg-transparent outline-none ring-0 shadow-none focus:outline-none focus-visible:outline-none data-[selected]:border-transparent data-[selected]:bg-transparent data-[selected]:ring-0 data-[selected]:shadow-none data-[hovered]:border-transparent data-[hovered]:bg-transparent data-[pressed]:bg-transparent data-[focused]:border-transparent data-[focused]:outline-none data-[focused]:ring-0 data-[focus-visible]:border-transparent data-[focus-visible]:bg-transparent data-[focus-visible]:outline-none data-[focus-visible]:ring-0 data-[focus-visible]:shadow-none data-[drop-target]:bg-transparent';
}

function hasBuilderDragPayload(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes(BUILDER_DRAG_TYPE);
}

function decodeNativeDragPayload(dataTransfer: DataTransfer): DragPayload | null {
  const rawValue = dataTransfer.getData(BUILDER_DRAG_TYPE);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<DragPayload>;

    if (parsed.source === 'library' && typeof parsed.presetId === 'string') {
      return {
        source: 'library',
        presetId: parsed.presetId,
      };
    }

    if (parsed.source === 'canvas' && typeof parsed.nodeId === 'string') {
      return {
        source: 'canvas',
        nodeId: parsed.nodeId,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function nodeSummary(node: BuilderNode) {
  if (node.kind === 'section') {
    return node.title || 'Secao';
  }

  if (node.kind === 'content') {
    return node.title || 'Texto';
  }

  return node.label || node.code || 'Campo';
}

function sectionGridClass(columns: SectionColumns) {
  if (columns === 3) {
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  }

  if (columns === 2) {
    return 'grid-cols-1 md:grid-cols-2';
  }

  return 'grid-cols-1';
}

function countNodes(nodes: BuilderNode[]) {
  return flattenNodes(nodes).length;
}

function countNodesByKind(nodes: BuilderNode[], kind: BuilderNodeKind) {
  return flattenNodes(nodes).filter((node) => node.kind === kind).length;
}

function flattenNodes(nodes: BuilderNode[]): BuilderNode[] {
  return nodes.flatMap((node) => (node.kind === 'section' ? [node, ...node.children] : [node]));
}

function flattenFieldNodes(nodes: BuilderNode[]): BuilderFieldNode[] {
  return flattenNodes(nodes).filter((node): node is BuilderFieldNode => node.kind === 'field');
}

function firstNodeId(nodes: BuilderNode[]) {
  return flattenNodes(nodes)[0]?.id ?? null;
}

function findNodeById(nodes: BuilderNode[], nodeId: string): BuilderNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    if (node.kind === 'section') {
      const child = node.children.find((item) => item.id === nodeId);
      if (child) {
        return child;
      }
    }
  }

  return null;
}

function updateNodeInTree(nodes: BuilderNode[], nodeId: string, updater: (node: BuilderNode) => BuilderNode): BuilderNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node);
    }

    if (node.kind !== 'section') {
      return node;
    }

    return {
      ...node,
      children: node.children.map((child) => (child.id === nodeId ? (updater(child) as BuilderChildNode) : child)),
    };
  });
}

function updateSectionChildren(
  nodes: BuilderNode[],
  sectionId: string,
  updater: (children: BuilderChildNode[]) => BuilderChildNode[],
): BuilderNode[] {
  return nodes.map((node) =>
    node.kind === 'section' && node.id === sectionId
      ? {
          ...node,
          children: updater(node.children),
        }
      : node,
  );
}

function removeNodeFromTree(nodes: BuilderNode[], nodeId: string): { nextNodes: BuilderNode[]; removedNode: BuilderNode | null } {
  const rootNode = nodes.find((node) => node.id === nodeId);
  if (rootNode) {
    return {
      nextNodes: nodes.filter((node) => node.id !== nodeId),
      removedNode: rootNode,
    };
  }

  for (const node of nodes) {
    if (node.kind !== 'section') {
      continue;
    }

    const child = node.children.find((item) => item.id === nodeId);
    if (!child) {
      continue;
    }

    return {
      nextNodes: nodes.map((candidate) =>
        candidate.kind === 'section' && candidate.id === node.id
          ? {
              ...candidate,
              children: candidate.children.filter((item) => item.id !== nodeId),
            }
          : candidate,
      ),
      removedNode: child,
    };
  }

  return {
    nextNodes: nodes,
    removedNode: null,
  };
}

function duplicateNodeInTree(nodes: BuilderNode[], nodeId: string): { nextNodes: BuilderNode[]; duplicatedNodeId: string | null } {
  const rootIndex = nodes.findIndex((node) => node.id === nodeId);

  if (rootIndex !== -1) {
    const duplicate = cloneNode(nodes[rootIndex]);
    return {
      nextNodes: insertIntoArray(nodes, rootIndex + 1, duplicate),
      duplicatedNodeId: duplicate.id,
    };
  }

  for (const node of nodes) {
    if (node.kind !== 'section') {
      continue;
    }

    const childIndex = node.children.findIndex((child) => child.id === nodeId);
    if (childIndex === -1) {
      continue;
    }

    const duplicate = cloneNode(node.children[childIndex]) as BuilderChildNode;
    return {
      nextNodes: nodes.map((candidate) =>
        candidate.kind === 'section' && candidate.id === node.id
          ? {
              ...candidate,
              children: insertIntoArray(candidate.children, childIndex + 1, duplicate),
            }
          : candidate,
      ),
      duplicatedNodeId: duplicate.id,
    };
  }

  return {
    nextNodes: nodes,
    duplicatedNodeId: null,
  };
}

function insertIntoArray<T>(items: T[], index: number, item: T) {
  const next = [...items];
  next.splice(index, 0, item);
  return next;
}

function reorderArray<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

function reorderNodesInList<T extends { id: string }>(
  items: T[],
  keys: Iterable<string | number>,
  targetKey: string,
  position: 'before' | 'after' | 'on',
) {
  const movingIds = Array.from(keys).map(String);
  const movingItems = items.filter((item) => movingIds.includes(item.id));
  const remaining = items.filter((item) => !movingIds.includes(item.id));
  const targetIndex = remaining.findIndex((item) => item.id === targetKey);

  if (targetIndex < 0) {
    return items;
  }

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  remaining.splice(insertIndex, 0, ...movingItems);
  return remaining;
}

function insertIntoList<T extends { id: string }>(
  items: T[],
  nodesToInsert: T[],
  targetKey?: string,
  position?: 'before' | 'after',
) {
  if (!targetKey || !position) {
    return [...items, ...nodesToInsert];
  }

  const targetIndex = items.findIndex((item) => item.id === targetKey);
  if (targetIndex === -1) {
    return [...items, ...nodesToInsert];
  }

  const next = [...items];
  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  next.splice(insertIndex, 0, ...nodesToInsert);
  return next;
}

function createNodeFromPreset(presetId: string, index: number): BuilderNode {
  const preset = libraryPresets.find((item) => item.id === presetId);

  if (!preset) {
    return createFieldNode('TEXT', index);
  }

  if (preset.kind === 'section') {
    return createSectionNode(index);
  }

  if (preset.kind === 'content') {
    return createContentNode(index);
  }

  return createFieldNode(preset.fieldType ?? 'TEXT', index);
}

function createFieldNode(fieldType: SupportFormFieldType, index: number): BuilderFieldNode {
  const label = defaultLabelForType(fieldType, index);

  return {
    id: createId('field'),
    kind: 'field',
    fieldType,
    code: normalizeKey(label),
    codeMode: 'AUTO',
    label,
    required: false,
    sensitive: false,
    helpText: '',
    optionsText: fieldType === 'SELECT' ? 'Opcao 1\nOpcao 2' : '',
    optionsMode: 'MANUAL',
    optionSourceKey: '',
    visibleWhen: null,
    requiredWhen: null,
  };
}

function createSectionNode(index: number): BuilderSectionNode {
  return {
    id: createId('section'),
    kind: 'section',
    title: `Secao ${index}`,
    description: '',
    columns: 1,
    children: [],
  };
}

function createContentNode(index: number): BuilderContentNode {
  return {
    id: createId('content'),
    kind: 'content',
    title: `Texto ${index}`,
    content: '',
  };
}

function cloneNode(node: BuilderNode): BuilderNode {
  if (node.kind === 'section') {
    return {
      ...node,
      id: createId('section'),
      children: node.children.map((child) => cloneNode(child) as BuilderChildNode),
    };
  }

  if (node.kind === 'content') {
    return {
      ...node,
      id: createId('content'),
    };
  }

  return {
    ...node,
    id: createId('field'),
    codeMode: 'MANUAL',
    code: `${normalizeKey(node.code || node.label || 'campo')}_${Math.floor(Math.random() * 1000)}`,
    visibleWhen: cloneConditionGroup(node.visibleWhen),
    requiredWhen: cloneConditionGroup(node.requiredWhen),
  };
}

function createCondition(): BuilderCondition {
  return {
    id: createId('condition'),
    fieldCode: '',
    operator: 'equals',
    value: '',
    valuesText: '',
  };
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultLabelForType(type: SupportFormFieldType, index: number) {
  const baseMap: Record<SupportFormFieldType, string> = {
    TEXT: 'Campo de texto',
    TEXTAREA: 'Campo descritivo',
    SELECT: 'Campo de selecao',
    BOOLEAN: 'Campo de confirmacao',
    DATE: 'Campo de data',
    NUMBER: 'Campo numerico',
    FILE: 'Campo de arquivo',
  };

  return `${baseMap[type]} ${index}`;
}

function fieldTypeLabel(type: SupportFormFieldType) {
  return libraryPresets.find((preset) => preset.kind === 'field' && preset.fieldType === type)?.label ?? type;
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isManualFieldCode(code: string, label: string) {
  const normalizedCode = normalizeKey(code);
  const normalizedLabel = normalizeKey(label);

  if (!normalizedCode) {
    return false;
  }

  return normalizedCode !== normalizedLabel;
}

function parseOptions(optionsText: string) {
  return optionsText
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

async function decodeDropItems(items: DropItem[]) {
  const payloads: DragPayload[] = [];

  for (const item of items) {
    if (item.kind !== 'text' || !item.types.has(BUILDER_DRAG_TYPE)) {
      continue;
    }

    try {
      const raw = await item.getText(BUILDER_DRAG_TYPE);
      payloads.push(JSON.parse(raw) as DragPayload);
    } catch {
      continue;
    }
  }

  return payloads;
}

function buildPayload({
  title,
  key,
  description,
  nodes,
}: {
  title: string;
  key: string;
  description: string;
  nodes: BuilderNode[];
}): Parameters<typeof createDynamicForm>[0] {
  const fieldNodes = flattenFieldNodes(nodes);

  return {
    key: key.trim() || normalizeKey(title),
    title: title.trim() || 'Formulario sem titulo',
    description: description.trim() || undefined,
    ownerType: 'GLOBAL' satisfies FormOwnerType,
    schema: {
      engine: 'RJSF_DND_LAB_V2',
      version: 2,
      layout: serializeNodes(nodes),
      runtime: buildRuntimeSchema(fieldNodes),
      conditions: fieldNodes.map((field) => {
        const visibleWhen = serializeConditionGroup(field.visibleWhen);
        const requiredWhen = serializeConditionGroup(field.requiredWhen);

        return {
          code: normalizeKey(field.code || field.label),
          ...(visibleWhen ? { visibleWhen } : {}),
          ...(requiredWhen ? { requiredWhen } : {}),
        };
      }),
    },
    fields: fieldNodes.map((field, index) => {
      const visibleWhen = serializeConditionGroup(field.visibleWhen);
      const requiredWhen = serializeConditionGroup(field.requiredWhen);

      return {
        code: normalizeKey(field.code || field.label),
        label: field.label.trim() || `Campo ${index + 1}`,
        type: field.fieldType,
        required: field.required,
        sensitive: field.sensitive,
        helpText: field.helpText.trim() || undefined,
        options:
          field.fieldType === 'SELECT' && field.optionsMode === 'MANUAL'
            ? parseOptions(field.optionsText)
            : undefined,
        ...(field.fieldType === 'SELECT' && field.optionsMode === 'REMOTE' && field.optionSourceKey
          ? { optionSourceKey: field.optionSourceKey }
          : {}),
        ...(visibleWhen ? { visibleWhen } : {}),
        ...(requiredWhen ? { requiredWhen } : {}),
        sortOrder: index + 1,
      };
    }),
  };
}

function buildRuntimeSchema(fieldNodes: BuilderFieldNode[]) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fieldNodes) {
    const code = normalizeKey(field.code || field.label);
    if (!code) {
      continue;
    }

    properties[code] = {
      type:
        field.fieldType === 'BOOLEAN'
          ? 'boolean'
          : field.fieldType === 'NUMBER'
            ? 'number'
            : 'string',
      title: field.label.trim() || 'Campo',
      ...(field.fieldType === 'SELECT' && field.optionsMode === 'MANUAL'
        ? { enum: parseOptions(field.optionsText) }
        : {}),
      ...(field.fieldType === 'DATE' ? { format: 'date' } : {}),
    };

    if (field.required) {
      required.push(code);
    }
  }

  return {
    schema: {
      type: 'object',
      properties,
      required,
    },
  };
}

function serializeNodes(
  nodes: BuilderNode[],
): Array<Record<string, unknown>> {
  return nodes.map((node) => {
    if (node.kind === 'section') {
      return {
        id: node.id,
        kind: node.kind,
        title: node.title,
        description: node.description,
        columns: node.columns,
        children: serializeNodes(node.children),
      };
    }

    if (node.kind === 'content') {
      return {
        id: node.id,
        kind: node.kind,
        title: node.title,
        content: node.content,
      };
    }

    return {
      id: node.id,
      kind: node.kind,
      fieldType: node.fieldType,
      code: node.code,
      label: node.label,
      required: node.required,
      sensitive: node.sensitive,
      helpText: node.helpText,
      optionsText: node.optionsText,
      optionsMode: node.optionsMode,
      ...(node.optionSourceKey ? { optionSourceKey: node.optionSourceKey } : {}),
      visibleWhen: serializeConditionGroup(node.visibleWhen),
      requiredWhen: serializeConditionGroup(node.requiredWhen),
    };
  });
}

function mapDefinitionToBuilderNodes(form: DynamicFormDefinition): BuilderNode[] {
  const schema = form.schema && typeof form.schema === 'object' ? (form.schema as Record<string, unknown>) : null;
  const layout = schema?.layout;

  if (Array.isArray(layout)) {
    const nodes = layout.map((item) => deserializeNode(item)).filter((item): item is BuilderNode => Boolean(item));
    if (nodes.length) {
      return nodes;
    }
  }

  if (form.fields.length) {
    return form.fields.map((field) => ({
      id: field.id,
      kind: 'field',
      fieldType: field.type,
      code: normalizeKey(field.code),
      codeMode: isManualFieldCode(field.code, field.label) ? 'MANUAL' : 'AUTO',
      label: field.label,
      required: field.required,
      sensitive: field.sensitive,
      helpText: field.helpText ?? '',
      optionsText: Array.isArray(field.options) ? field.options.join('\n') : '',
      optionsMode: field.optionSourceKey ? 'REMOTE' : 'MANUAL',
      optionSourceKey: field.optionSourceKey ?? '',
      visibleWhen: deserializeConditionGroup(field.visibleWhen),
      requiredWhen: deserializeConditionGroup(field.requiredWhen),
    }));
  }

  return [createFieldNode('TEXT', 1)];
}

function deserializeNode(value: unknown): BuilderNode | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const kind = String(record.kind ?? '');

  if (kind === 'section') {
    const children = Array.isArray(record.children)
      ? record.children
          .map((item) => deserializeNode(item))
          .filter((item): item is BuilderChildNode => item !== null && item.kind !== 'section')
      : [];

    return {
      id: String(record.id ?? createId('section')),
      kind: 'section',
      title: String(record.title ?? ''),
      description: String(record.description ?? ''),
      columns: normalizeColumns(record.columns),
      children,
    };
  }

  if (kind === 'content') {
    return {
      id: String(record.id ?? createId('content')),
      kind: 'content',
      title: String(record.title ?? ''),
      content: String(record.content ?? ''),
    };
  }

  return {
    id: String(record.id ?? createId('field')),
    kind: 'field',
    fieldType: normalizeFieldType(record.fieldType),
    code: String(record.code ?? ''),
    codeMode: isManualFieldCode(String(record.code ?? ''), String(record.label ?? '')) ? 'MANUAL' : 'AUTO',
    label: String(record.label ?? ''),
    required: Boolean(record.required),
    sensitive: Boolean(record.sensitive),
    helpText: String(record.helpText ?? ''),
    optionsText: String(record.optionsText ?? ''),
    optionsMode: record.optionsMode === 'REMOTE' ? 'REMOTE' : 'MANUAL',
    optionSourceKey: String(record.optionSourceKey ?? ''),
    visibleWhen: deserializeConditionGroup(record.visibleWhen),
    requiredWhen: deserializeConditionGroup(record.requiredWhen),
  };
}

function normalizeColumns(value: unknown): SectionColumns {
  const numeric = Number(value);
  return numeric === 2 || numeric === 3 ? numeric : 1;
}

function normalizeFieldType(value: unknown): SupportFormFieldType {
  const supported: SupportFormFieldType[] = ['TEXT', 'TEXTAREA', 'SELECT', 'BOOLEAN', 'DATE', 'NUMBER', 'FILE'];
  const current = String(value ?? '');
  return supported.includes(current as SupportFormFieldType) ? (current as SupportFormFieldType) : 'TEXT';
}

function conditionOperatorOptions(fieldType: SupportFormFieldType) {
  return operatorOptionsByFieldType[fieldType] ?? operatorOptionsByFieldType.TEXT;
}

function normalizeConditionForField(
  condition: BuilderCondition,
  fieldType: SupportFormFieldType,
  operator: ConditionOperator = condition.operator,
): BuilderCondition {
  const normalized = {
    ...condition,
    operator,
  };

  if (operator === 'exists') {
    return {
      ...normalized,
      value: '',
      valuesText: '',
    };
  }

  if (fieldType === 'BOOLEAN') {
    const nextValue = normalized.value === 'true' || normalized.value === 'false' ? normalized.value : '';
    return {
      ...normalized,
      value: nextValue,
      valuesText: '',
    };
  }

  if (fieldType === 'SELECT') {
    if (operator === 'in') {
      return {
        ...normalized,
        value: '',
      };
    }

    return {
      ...normalized,
      valuesText: '',
    };
  }

  return {
    ...normalized,
    valuesText: '',
  };
}

function compareConditionValues(actualValue: unknown, expectedValue: string) {
  const actualNumber = Number(actualValue);
  const expectedNumber = Number(expectedValue);

  if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
    return actualNumber - expectedNumber;
  }

  const actualText = String(actualValue ?? '').trim();
  const expectedText = String(expectedValue ?? '').trim();

  if (isIsoDateValue(actualText) && isIsoDateValue(expectedText)) {
    return actualText.localeCompare(expectedText);
  }

  return actualText.localeCompare(expectedText);
}

function isIsoDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function evaluateConditionGroup(group: BuilderConditionGroup | null, formData: Record<string, unknown>) {
  if (!group) {
    return false;
  }

  const evaluations = group.clauses.map((clause) => evaluateCondition(clause, formData));
  return group.mode === 'all' ? evaluations.every(Boolean) : evaluations.some(Boolean);
}

function evaluateCondition(condition: BuilderCondition, formData: Record<string, unknown>) {
  const fieldCode = normalizeKey(condition.fieldCode);
  const actualValue = formData[fieldCode];

  switch (condition.operator) {
    case 'equals':
      return String(actualValue ?? '') === condition.value;
    case 'notEquals':
      return String(actualValue ?? '') !== condition.value;
    case 'contains':
      return String(actualValue ?? '').toLowerCase().includes(condition.value.toLowerCase());
    case 'exists':
      return actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== '';
    case 'in': {
      const values = condition.valuesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return values.includes(String(actualValue ?? ''));
    }
    case 'greaterThan':
      return compareConditionValues(actualValue, condition.value) > 0;
    case 'greaterThanOrEqual':
      return compareConditionValues(actualValue, condition.value) >= 0;
    case 'lessThan':
      return compareConditionValues(actualValue, condition.value) < 0;
    case 'lessThanOrEqual':
      return compareConditionValues(actualValue, condition.value) <= 0;
    default:
      return false;
  }
}

function serializeConditionGroup(group: BuilderConditionGroup | null) {
  if (!group) {
    return undefined;
  }

  const clauses = group.clauses
    .map((clause) => serializeCondition(clause))
    .filter(Boolean) as Array<Record<string, unknown>>;

  if (!clauses.length) {
    return undefined;
  }

  return group.mode === 'all' ? { all: clauses } : { any: clauses };
}

function serializeCondition(condition: BuilderCondition) {
  const fieldCode = normalizeKey(condition.fieldCode);

  if (!fieldCode) {
    return null;
  }

  if (condition.operator === 'exists') {
    return {
      fieldCode,
      operator: condition.operator,
    };
  }

  if (condition.operator === 'in') {
    const values = condition.valuesText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length
      ? {
          fieldCode,
          operator: condition.operator,
          values,
        }
      : null;
  }

  return condition.value.trim()
    ? {
        fieldCode,
        operator: condition.operator,
        value: condition.value.trim(),
      }
    : null;
}

function deserializeConditionGroup(value: unknown): BuilderConditionGroup | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const all = Array.isArray(record.all) ? record.all : null;
  const any = Array.isArray(record.any) ? record.any : null;
  const mode: ConditionMode = all ? 'all' : any ? 'any' : 'all';
  const source = all ?? any;

  if (!source?.length) {
    return null;
  }

  const clauses = source
    .map((item) => deserializeCondition(item))
    .filter((item): item is BuilderCondition => Boolean(item));

  return clauses.length ? { mode, clauses } : null;
}

function deserializeCondition(value: unknown): BuilderCondition | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const operator = String(record.operator ?? '');
  const supportedOperators = new Set<ConditionOperator>(['equals', 'notEquals', 'contains', 'exists', 'in']);

  if (!supportedOperators.has(operator as ConditionOperator)) {
    return null;
  }

  const values = Array.isArray(record.values) ? record.values.map((item) => String(item)) : [];

  return {
    id: createId('condition'),
    fieldCode: String(record.fieldCode ?? ''),
    operator: operator as ConditionOperator,
    value: typeof record.value === 'string' ? record.value : '',
    valuesText: values.join(', '),
  };
}

function cloneConditionGroup(group: BuilderConditionGroup | null): BuilderConditionGroup | null {
  return group
    ? {
        mode: group.mode,
        clauses: group.clauses.map((clause) => ({
          ...clause,
          id: createId('condition'),
        })),
      }
    : null;
}

function publicationVersion(form: DynamicFormDefinition | null) {
  const currentVersion = form?.version ?? 0;
  const nextVersion = currentVersion + 1;

  return {
    from: form ? `v${currentVersion}` : 'Novo formulario',
    to: `v${nextVersion} publicada`,
  };
}
