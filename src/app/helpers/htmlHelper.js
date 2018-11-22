#!/usr/bin/env node

'use strict';
const fs = require('fs');
const _ = require('lodash');
const showdown = require('./markdownHelper');

exports.generators = {
    create: createHtml
};

function createHtml(evaTask, output) {
    let html = '';
    _.forEach(evaTask.tasks, checklist => {
        // draw the checklist title
        html += `<h2>${checklist.title} (00:${checklist.duration})</h2>`;
        html += '<table class="gridtable">';

        html += '<tr>';
        let actorTasks = [];
        _.forEach(evaTask.actors, actor => {
            html += createActorHeading(actor);

            actorTasks = checklist.evaTasks.filter(task => {
                return Object.keys(task)[0] === actor.role;
            });

            actor.actorTasks = actorTasks;
        });
        html += '</tr>';

        html += '<tr>';
        _.forEach(evaTask.actors, actor => {
            html += '<td><ol>';
            _.forEach(actor.actorTasks, actorTask => {
                if (typeof actorTask.step === 'string') {
                    html += writeStepToHtml(
                        actorTask.step,
                        actorTask.checkboxes,
                        actorTask.substeps,
                        actorTask.images
                    );
                } else {
                    _.forEach(actorTask.step, step => {
                        html += writeStepToHtml(step, actorTask.checkboxes,
                            actorTask.substeps, actorTask.images);
                    });
                }
            });
            html += '</ol></td>';
        });
        html += '</tr>';

        html += '</table>';
    });

    console.log(html);
    writeHtmlToFile(output, evaTask.procedure_name, html);
}

function createActorHeading(actor) {
    let html = `<td>${actor.role}`;
    if (actor.name) {
        html += `(${actor.name})`;
    }
    html += `</td>`;
    return html;
}

function writeStepToHtml(step, checkboxes, substeps, images) {
    let html = `<li>${showdown.convert(step)}`;
    if (checkboxes) {
        html += '<ul>';
        if (typeof checkboxes === 'string') {
            html += `<li>${showdown.convert(checkboxes)}</li>`;
        } else {
            _.forEach(checkboxes, checkbox => {
                html += `<li>${showdown.convert(checkbox)}</li>`;
            });
        }
        html += '</ul>';
    }

    if (substeps) {
        html += '<ul>';
        if (typeof substeps === 'string') {
            html += writeStepToHtml(substeps);
        } else {
            _.forEach(substeps, substep => {
                html += writeStepToHtml(substep);
            });
        }
        html += '</ul>';
    }

    if (typeof images === 'string') {
        html += writeImageToHtml(images);
    } else if (images) {
        _.forEach(images, (img) => {
            html += writeImageToHtml(img);
        });
    }

    html += '</li>';

    return html;
}

function writeImageToHtml(image) {
    return `<img src="${image}" alt="image" />`
}

function writeHtmlToFile(output, $title, $content) {
    let htmlTemplate = fs.readFileSync(
        './templates/htmlHelper-template.html',
        'utf8'
    );
    htmlTemplate = _.replace(
        htmlTemplate,
        new RegExp('{{content}}', 'g'),
        $content
    );
    htmlTemplate = _.replace(htmlTemplate, new RegExp('{{title}}', 'g'), $title);

    fs.writeFile(output, htmlTemplate, err => {
        if (!!err) {
            console.log('Unable to save file:');
            console.log(err);
        }
    });
}