
import React from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RenderItemProps {
    item: any;
    index: number;
    dragListeners: any;
    dragAttributes: any;
}

interface SortableListProps {
    items: { id: string }[];
    onOrderChange: (newItems: any[]) => void;
    renderItem: (props: RenderItemProps) => React.ReactNode;
    className?: string;
    itemClassName?: string;
}

const SortableItem: React.FC<{ 
    id: string; 
    item: any;
    index: number;
    renderItem: (props: RenderItemProps) => React.ReactNode;
    className?: string;
}> = ({ id, item, index, renderItem, className }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as const,
        touchAction: 'none'
    };

    return (
        <div ref={setNodeRef} style={style} className={className}>
            {renderItem({ item, index, dragListeners: listeners, dragAttributes: attributes })}
        </div>
    );
};

export const SortableList: React.FC<SortableListProps> = ({ items, onOrderChange, renderItem, className, itemClassName }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            onOrderChange(newItems);
        }
    };

    return (
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={items.map(i => i.id)} 
                strategy={verticalListSortingStrategy}
            >
                <div className={className}>
                    {items.map((item, index) => (
                        <SortableItem 
                            key={item.id} 
                            id={item.id} 
                            item={item}
                            index={index}
                            className={itemClassName}
                            renderItem={renderItem}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
