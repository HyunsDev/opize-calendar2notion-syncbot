export type NotionPropType =
    | 'title'
    | 'select'
    | 'date'
    | 'checkbox'
    | 'url'
    | 'rich_text'
    | 'last_edited_by';

export const REQUIRED_PROPS = [
    'title',
    'calendar',
    'date',
    'delete',
    'link',
    'location',
    'description',
    'last_edited_by',
] as const;

export const ADDABLE_REQUIRED_PROPS = [
    'delete',
    'last_edited_by',
    'link',
    'location',
    'description',
] as const;

export const REQUIRED_NOTION_PROPS_MAP: Record<
    (typeof REQUIRED_PROPS)[number],
    NotionPropType
> = {
    title: 'title',
    calendar: 'select',
    date: 'date',
    delete: 'checkbox',
    link: 'url',
    description: 'rich_text',
    location: 'rich_text',
    last_edited_by: 'last_edited_by',
} as const;

export const ADDABLE_REQUIRED_NOTION_PROPS_MAP: Record<
    (typeof ADDABLE_REQUIRED_PROPS)[number],
    'checkbox' | 'last_edited_by' | 'url' | 'rich_text'
> = {
    delete: 'checkbox',
    last_edited_by: 'last_edited_by',
    description: 'rich_text',
    link: 'url',
    location: 'rich_text',
} as const;
