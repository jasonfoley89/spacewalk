#!/usr/bin/env node

"use strict";
const fs = require("fs");
const _ = require("lodash");
const formatter = require("./markdownHelper");

exports.generators = {
    create: createHtml
};

function createHtml(evaTask, output, htmlFileTemplate) {
    let html = "";

    _.forEach(evaTask.tasks, checklist => {
        // draw the checklist title
        html += `<h2>${checklist.title} (${checklist.duration})</h2>`;
        html += '<table class="gridtable">';

        const rowWidth = 100 / evaTask.actors.length;
        html += "<tr>";
        _.forEach(evaTask.actors, actor => {
            html += createActorHeading(actor);
            actor.counter = 1;
        });
        html += "</tr>";

        _.forEach(checklist.evaTasks, task => {
            let actor = Object.keys(task)[0];
            if (actor.toLowerCase() !== "simo") {
                html += `<tr>`;
                let idx = _.findIndex(evaTask.actors, a => a.role === actor);
                if (idx > 0) {
                    for (let $td = 0; $td < idx; $td++) {
                        html += `<td style="width: ${rowWidth}%;"></td>`;
                    }
                }
                html += writeRowToHtml(task, actor, rowWidth, evaTask.actors);

                if (idx < evaTask.actors.length - 1) {
                    for (let $td = idx; $td < evaTask.actors.length - 1; $td++) {
                        html += `<td style="width: ${rowWidth}%;"></td>`;
                    }
                }

                html += "</tr>";
            } else {
                if (task[actor] !== null) {
                    html += '<tr>';
                    let simo = task[actor];
                    let simoActors = Object.keys(simo);

                    let actorCols = new Array(evaTask.actors.length);
                    _.forEach(simoActors, simoActor => {
                        let idx = _.findIndex(evaTask.actors, a => a.role === simoActor);
                        if (idx < 0) {
                            console.log(`Found invalid actor: ${simoActor}`);
                        } else {
                            actorCols[idx] = writeRowToHtml(simo, simoActor, rowWidth, evaTask.actors);
                        }
                    });

                    for (let $td = 0; $td < actorCols.length; $td++) {
                        if (actorCols[$td] === null || !actorCols[$td]) {
                            actorCols[$td] = `<td style="width: ${rowWidth}%;"></td>`;
                        }
                    }

                    _.forEach(actorCols, aCol => {
                        html += aCol;
                    });

                    html += '</tr>';
                }
            }
        });

        html += "</table>";
    });

    writeHtmlToFile(output, evaTask.procedure_name, html, htmlFileTemplate);
}

function createActorHeading(actor) {
    let html = `<th>${actor.role}`;
    if (actor.name) {
        html += `(${actor.name})`;
    }
    html += `</th>`;
    return html;
}

function writeRowToHtml(task, actor, rowWidth, allActors) {
    let actorIdx = _.findIndex(allActors, (a) => a.role === actor);
    if (actorIdx < 0) {
        console.log(`Found invalid actor: ${actor}`);
    } else {
        let html = `<td style="width: ${rowWidth}%;">`;
        if (typeof task[actor] !== "string") {
            let isFirst = true;
            _.forEach(task[actor], steps => {
                const stepData = !!steps.step ? steps.step : "";
                const checkboxes = steps.checkboxes ? steps.checkboxes : null;
                const substeps = steps.substeps ? steps.substeps : null;
                const images = steps.images ? steps.images : null;
                const title = steps.title ? steps.title : null;
                const warning = steps.warning ? steps.warning : undefined;
                const caution = steps.caution ? steps.caution : undefined;

                if (title !== null) {
                    html += `${formatter.convert(title)}`;
                }

                if (warning || caution) {
                    const css = warning ? "warning" : "caution";
                    html += `<div class"alert alert-"${css}">
                        <strong class="text-center" style="text-align: center;text-transform: uppercase;">${css}</strong>
                        <p>${warning || caution}</p>
                    </div>`;
                } else {
                    if (isFirst) {
                        html += `<ol start=${allActors[actorIdx].counter}>`;
                        isFirst = false;
                    }
                    html += `${writeStepToHtml(stepData, checkboxes, substeps, images)}`;
                    allActors[actorIdx].counter += 1;
                }
            });
        } else {
            html += `<ol start=${allActors[actorIdx].counter}>`;
            html += `${writeStepToHtml(task[actor])}`;
            allActors[actorIdx].counter += 1;
        }
        html += "</ol></td>";
        return html;
    }

    return '';
}

function writeStepToHtml(step, checkboxes, substeps, images) {
    // console.log("=>", step, checkboxes, substeps, images);

    let html = `<li>${formatter.convert(step)}`;
    if (checkboxes) {
        html += "<ul>";
        if (typeof checkboxes === "string") {
            if (checkboxes.indexOf('{{CHECKMARK}}') < 0) {
                checkboxes = `{{CHECKMARK}} ${checkboxes}`;
            }
            html += `<li>${formatter.convert(checkboxes)}</li>`;
        } else {
            _.forEach(checkboxes, checkbox => {
                if (checkbox.indexOf('{{CHECKMARK}}') < 0) {
                    checkbox = `{{CHECKMARK}} ${checkbox}`;
                }

                html += `<li>${formatter.convert(checkbox)}</li>`;
            });
        }
        html += "</ul>";
    }

    if (substeps) {
        html += "<ul>";
        if (typeof substeps === "string") {
            html += writeStepToHtml(substeps);
        } else {
            _.forEach(substeps, substep => {
                html += writeStepToHtml(substep.step);
            });
        }
        html += "</ul>";
    }

    if (typeof images === "string") {
        html += writeImageToHtml(images);
    } else if (images) {
        _.forEach(images, img => {
            html += writeImageToHtml(img);
        });
    }

    html += "</li>";

    return html;
}

function writeImageToHtml(image) {
    return `<img class="img-fluid" src="${image}" alt="image" />`;
}

function writeHtmlToFile(output, $title, $content, htmlFileTemplate) {
    let htmlTemplate = fs.readFileSync(
        htmlFileTemplate,
        "utf8"
    );
    htmlTemplate = _.replace(
        htmlTemplate,
        new RegExp("{{content}}", "g"),
        $content
    );
    htmlTemplate = _.replace(htmlTemplate, new RegExp("{{title}}", "g"), $title);

    fs.writeFile(output, htmlTemplate, err => {
        if (!!err) {
            console.log("Unable to save file:");
            console.log(err);
        }
    });
}