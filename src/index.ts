function add(a: number, b: number): number {
    if (a == null || b == null) {
        throw new Error("Invalid Values");
    }
    return a + b;
}

async function main() {
    console.log(add(2, 5));
    
    await new Promise(resolve => {
        setTimeout(resolve, 1000);
    });

    // @ts-expect-error invalid val
    console.log(add(2));
}

main()
.catch(() => {})
.finally(async () => {
    await new Promise(resolve => {
        setTimeout(resolve, 2000);
    });

    console.log({
        coverage: JSON.stringify(await (global as any).__getCoverage__?.(), null, 2),
    });
    process.exit(1);
});
