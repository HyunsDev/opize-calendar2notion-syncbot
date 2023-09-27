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
    'googleCalendarEvent',
    'location',
    'description',
    'last_edited_by',
] as const;

export const ADDABLE_REQUIRED_PROPS = [
    'delete',
    'last_edited_by',
    'googleCalendarEvent',
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
    googleCalendarEvent: 'url',
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
    googleCalendarEvent: 'url',
    location: 'rich_text',
} as const;
