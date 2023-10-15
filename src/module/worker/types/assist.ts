export abstract class Assist {
    public assistName: string;

    public abstract dependencyInjection(
        dependency: Record<string, Assist>,
    ): void;
}
