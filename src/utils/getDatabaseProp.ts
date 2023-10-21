import { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';

function isPropType<
    T extends DatabaseObjectResponse['properties'][string]['type'],
>(
    obj: DatabaseObjectResponse['properties'][string],
    type: T,
): obj is Extract<DatabaseObjectResponse['properties'][string], { type: T }> {
    return obj.type === type;
}

export const getDatabaseProp = <
    T extends DatabaseObjectResponse['properties'][string]['type'] = 'title',
>(
    database: DatabaseObjectResponse,
    propId: string,
    type: T,
) => {
    const prop = Object.values(database.properties).find(
        (e) => e.id === propId,
    );
    if (isPropType(prop, type)) {
        return prop;
    } else {
        throw new Error(
            `Property ${propId} is not of type ${type}, but ${prop?.type}`,
        );
    }
};
