
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

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    isActive?: boolean;
    onClick?: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, className, onClick }) => {
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
    };

    return (
        <div ref={setNodeRef} style={style} className={className} onClick={onClick}>
            {/* Drag Handle Wrapper */}
            <div {...attributes} {...listeners} className="touch-none h-full">
                {children}
            </div>
        </div>
    );
};

interface SortableListProps {
    items: { id: string }[];
    onOrderChange: (newItems: any[]) => void;
    renderItem: (item: any, index: number) => React.ReactNode;
    className?: string;
    itemClassName?: string;
}

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
                            className={itemClassName}
                        >
                            {renderItem(item, index)}
                        </SortableItem>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
