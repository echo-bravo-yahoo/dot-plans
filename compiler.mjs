import * as fs from 'node:fs'
import * as path from 'node:path'
import Handlebars from 'handlebars'
import livereload from 'livereload'
import handlebarsHelperRepeat from 'handlebars-helper-repeat'
import listToPercentage from './helpers/listToPercentage.mjs'
import { spawn } from 'child_process'
import nodeHtmlToImage from 'node-html-to-image'

const server = livereload.createServer()
// watch templates and CSS, only rebuild templates
const paths = [...fs.readdirSync('./templates').map((path) => './templates/' + path)]

Handlebars.registerHelper('repeat', handlebarsHelperRepeat)
Handlebars.registerHelper('listToPercentage', listToPercentage)

const times = ["6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30", "4:00", "4:30", "5:00", "5:30", "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30"]

const contexts = {
  './templates/week-left.handlebars': {
    days: ["Monday", "Tuesday", "Wednesday"],
    times
  },
  './templates/week-right.handlebars': {
    days: ["Thursday", "Friday", "Saturday", "Sunday"],
    times
  },
  './templates/week-unified.handlebars': {
    topDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
    bottomDays: ["Friday", "Saturday", "Sunday"]
  },
  './templates/month.handlebars': {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  }
}

fs.watch('./css', { persistent: true }, compileTemplates)
fs.watch('./templates', { persistent: true }, compileTemplates)

function buildHTMLPath(templatePath) {
  const htmlPath = path.normalize('./html/' + path.basename(templatePath, path.extname(templatePath)) + '.html')
  return htmlPath
}

function buildCSSPath(templatePath) {
  const cssPath = path.normalize('./css/' + path.basename(templatePath, '.handlebars') + '.css')
  console.log('input', templatePath, 'output', cssPath)
  return cssPath
}

function startHotReload() {
  let htmlPaths = fs.readdirSync('./html').map((path) => './html/' + path)
  // this is dumb, but templatePath has to be the path to a real file, even when kicking off the first build
  compileTemplates("change", "./templates/month.handlebars" )
  server.watch(htmlPaths)
  spawn('node', ['./node_modules/http-server/bin/http-server', '-p 8082'])
  console.log('Server with compiled HTML running at: http://localhost:8082/html/')
}

function compileTemplates(eventType) {
  for(let i = 0; i < paths.length; i++) {
    compileTemplate(eventType, paths[i])
  }
}

function compileTemplate(eventType, templatePath) {
  console.log('eventType', eventType, 'templatePath', templatePath)
  if (eventType === 'change' && path.extname(templatePath) === '.handlebars') {
    let context = contexts[templatePath]
    let commonCSSPath = path.normalize('./css/common.css')
    let template = String(fs.readFileSync(templatePath))
    let css
    console.log('Updated %s', templatePath)
    try {
      css = String(fs.readFileSync(buildCSSPath(templatePath)))
      css += String(fs.readFileSync(commonCSSPath))
    } catch (e) {}
    const compiled = Handlebars.compile(template)
    const string = compiled({ ...context, css })
    const imagePath = path.normalize('./images/' + path.basename(templatePath, '.handlebars') + '.png')
    fs.writeFileSync(buildHTMLPath(templatePath), string)
    nodeHtmlToImage({
      output: imagePath,
      html: string
    }).then(() => console.log(`Saved ${imagePath}.`))
  }
}

startHotReload()
