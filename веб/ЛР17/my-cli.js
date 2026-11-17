#!/usr/bin/env node
const { Command, Option } = require('commander');
const fs = require('node:fs/promises');
const { createWriteStream } = require('node:fs');
const { pipeline } = require('node:stream/promises');

const group = '478';
const types = { web: 'Web-приложение', cli: 'CLI-утилита', library: 'Библиотека', service: 'Микросервис' };
const features = ['TypeScript', 'ESLint', 'Prettier', 'Jest'];
const program = new Command()
    .name('my-cli')
    .description('CLI-приложение для лабораторной работы №17')
    .version('1.0.0')
    .option('-v, --verbose', 'подробный вывод');

program.command('greet [name]').description('поприветствовать пользователя')
    .action((name = 'Студент') => console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ${group}.`));

program.command('info').description('вывести информацию о группе').action(() => {
    console.log(`Группа: ${group}\nСтудент: Диана\nЛабораторная работа: №17\nДата: ${new Date().toLocaleDateString('sv-SE')}`);
});

program.command('generate').description('сгенерировать отчёт')
    .addOption(new Option('-t, --type <type>', 'тип отчёта').choices(['html', 'pdf', 'json', 'csv']).default('html'))
    .option('-o, --output <path>', 'путь для сохранения')
    .option('-f, --force', 'перезаписать существующий файл')
    .option('--dry-run', 'показать действия без записи файла')
    .action(async options => {
        const { type, force, dryRun } = options;
        const output = options.output ?? `./output.${type}`;
        if (dryRun || program.opts().verbose) {
            const prefix = dryRun ? '[DRY-RUN]' : '[VERBOSE]';
            console.log(`${prefix} Тип отчёта: ${type}\n${prefix} Путь сохранения: ${output}`);
        }
        if (dryRun) return;

        const flag = force ? 'w' : 'wx';
        if (type === 'pdf') {
            const PDFDocument = require('pdfkit');
            const pdf = new PDFDocument();
            pdf.fontSize(20).text('Laboratory work 17');
            pdf.fontSize(12).text(`Group: ${group}`);
            pdf.end();
            await pipeline(pdf, createWriteStream(output, { flags: flag }));
        } else {
            const content = {
                html: `<!doctype html><meta charset="utf-8"><title>ЛР17</title><h1>Лабораторная работа №17</h1><p>Группа ${group}</p>\n`,
                json: `${JSON.stringify({ lab: 17, group }, null, 2)}\n`,
                csv: `lab,group\n17,${group}\n`,
            };
            await fs.writeFile(output, content[type], { flag });
        }
        console.log(`Отчёт успешно сгенерирован: ${output}`);
    });

program.command('init').description('инициализация проекта')
    .option('--name <name>', 'название проекта')
    .addOption(new Option('--type <type>', 'тип проекта').choices(Object.keys(types)))
    .option('--typescript', 'выбрать TypeScript')
    .option('--eslint', 'выбрать ESLint')
    .option('--prettier', 'выбрать Prettier')
    .option('--jest', 'выбрать Jest')
    .option('--git', 'использовать Git')
    .option('--no-interactive', 'отключить интерактивный режим')
    .action(async options => {
        let { name, type, git } = options;
        let selected = features.filter(feature => options[feature.toLowerCase()]);
        if (!name && !process.stdin.isTTY) {
            let input = '';
            for await (const chunk of process.stdin.setEncoding('utf8')) input += chunk;
            name = input.trim();
        }
        if (!name || !type) {
            if (!options.interactive || !process.stdin.isTTY) {
                const missing = [!name && '--name', !type && '--type'].filter(Boolean);
                throw new Error(`В неинтерактивном режиме укажите ${missing.join(' и ')}`);
            }
            const inquirer = require('inquirer').default;
            const answers = await inquirer.prompt([
                { name: 'name', type: 'input', message: 'Введите название проекта:', when: !name,
                    validate: value => value.trim().length > 0 || 'Введите название' },
                { name: 'type', type: 'list', message: 'Выберите тип проекта:', when: !type,
                    choices: Object.entries(types).map(([value, name]) => ({ name, value })) },
                { name: 'features', type: 'checkbox', message: 'Выберите дополнительные опции:',
                    choices: features.map(name => ({ name, checked: selected.includes(name) })) },
                { name: 'git', type: 'confirm', message: 'Использовать Git?', default: git ?? true },
                { name: 'token', type: 'password', message: 'Введите тестовый токен доступа:', mask: '*' },
            ]);
            name ||= answers.name.trim();
            type ||= answers.type;
            selected = answers.features;
            git = answers.git;
        }
        console.log(`✓ Проект "${name}" успешно инициализирован!`);
        console.log(`Тип: ${types[type]}\nОпции: ${selected.join(', ') || 'нет'}\nGit: ${git ? 'да' : 'нет'}`);
    });

program.command('convert').description('конвертировать JSON без изменения данных')
    .requiredOption('-i, --input <path>', 'исходный JSON-файл')
    .requiredOption('-o, --output <path>', 'отформатированный JSON-файл')
    .action(async ({ input, output }) => {
        const data = JSON.parse(await fs.readFile(input, 'utf8'));
        await fs.writeFile(output, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
        console.log(`Файл сохранён: ${output}`);
    });

if (process.argv.length === 2) {
    program.outputHelp();
} else {
    program.parseAsync().catch(error => {
        console.error(`Ошибка: ${error.message}`);
        process.exitCode = 1;
    });
}
