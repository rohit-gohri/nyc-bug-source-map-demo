function add(a: number, b: number): number {
    if (a == null || b == null) {
        throw new Error("Invalid Values");
    }
    return a + b;
}

process.on('exit', () => {
    console.log({
        coverage: JSON.stringify((global as any).__coverage__, null, 2),
    });
    process.exit(0);
});


async function main() {
    console.log(add(2, 5));
    
    await new Promise(resolve => {
        setTimeout(resolve, 1000);
    });

    // @ts-expect-error invalid val
    console.log(add(2));
}

main();
