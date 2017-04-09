/*
 * Mixcloud Tracklist browser extension
 *
 * Copyright (c) 2015 Andrew Lawson <http://adlawson.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * @link https://github.com/adlawson/mixcloud-tracklist
 */

'use strict';

const dust = require('dustjs-linkedin');
const request = require('request');
const browser = require('./browser');

main();
browser.onChange(browser.querySelector('[m-contents="maincontent"]'), main);

function main() {
    const parent = browser.querySelector('[ng-controller="CloudcastHeaderCtrl"]');
    if (parent !== null) {
        fetchData(window.location, (data) => {
            const tracklistTemplate = require('./templates/tracklist')(dust); // Required by both new and legacy
            const empty = parent.querySelector('[ng-init]');
            const toggleContainer = browser.querySelector('footer.actions');
            const moreButton = toggleContainer.querySelector('[ng-controller="DropdownCtrl"]');
            const existingButton = toggleContainer.querySelector('[m-click="tracklistShown=!tracklistShown"]');
            if (existingButton === null) { // If looking at your own mix
                render(tracklistTemplate, data.cloudcast, tracklistHtml => {
                    browser.insert(empty, tracklistHtml);
                    render(require('./templates/toggle')(dust), {}, toggleHtml => {
                        browser.insertBefore(toggleContainer, moreButton, toggleHtml);
                        toggleEvents(empty, toggleContainer);
                    });
                });
            }
        });
    }
}

function fetchData(location, fn) {
    request({
        "uri": "/player/details",
        "baseUrl": location.protocol + "//" + location.hostname,
        "qs": { "key": location.pathname },
        "json": true
    }, (error, response, data) => {
        if (!error && response.statusCode === 200 && data.cloudcast.sections.length > 0) {
            chrome.storage.sync.get({
              timestamp: false
            }, (options) => {
                fn(insertTimestamp(insertTrackNumber(data), options));
            });
        } else {
            console.error(error);
        }
    });
}

function insertTimestamp(data, options) {
    data.cloudcast.sections.forEach((section, i) => {
        if (section.start_time !== null && options.timestamp === true) {
            const minutes = Math.floor(section.start_time / 60);
            const seconds = ("0" + section.start_time % 60).slice(-2);
            section.timestamp = `${minutes}:${seconds}`;
        } else {
          section.timestamp = null;
        }
    });
    return data;
}

function insertTrackNumber(data) {
    data.cloudcast.sections.forEach((section, i) => {
        section.track_number = i + 1;
    });
    return data;
}

function render(source, data, fn) {
    dust.render(source, data, (error, html) => {
        if (!error) fn(html);
        else console.error(error);
    });
}

function toggleEvents(tracklistContainer, toggleContainer) {
    const button = toggleContainer.querySelector('.tracklist-toggle-text');
    const tracklist = tracklistContainer.querySelector('.cloudcast-tracklist');
    button.addEventListener('click', event => {
        const hide = button.querySelector('[ng-show="tracklistShown"]');
        const show = button.querySelector('[ng-show="!tracklistShown"]');
        hide.classList.toggle('ng-hide');
        show.classList.toggle('ng-hide');
        button.classList.toggle('btn-toggled');
        tracklist.classList.toggle('ng-hide');
    });
}
