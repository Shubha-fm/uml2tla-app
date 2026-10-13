import {test,expect} from '@playwright/test';

test('Project home and real verification remain usable',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Build a model. Understand its behavior.'})).toBeVisible();
 await page.getByRole('button',{name:'Open workspace'}).click();
 await page.getByRole('tab',{name:'Contracts',exact:true}).click();
 await page.getByRole('button',{name:'Load passing TLC example'}).click();
 await page.getByRole('button',{name:'Verify model',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Checks passed'})).toBeVisible({timeout:30000});
 await page.getByRole('tab',{name:'Generated files',exact:true}).click();
 await expect(page.locator('.outputs-grid .code').first()).toContainText('EXTENDS TLC');
 await page.getByRole('tab',{name:'Trace explorer',exact:true}).click();
 await expect(page.locator('.trace-scroll')).toBeVisible();
 expect(errors).toEqual([]);
});

test('Zoomed dragging is one undo step and diagram drafts survive switching',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Open workspace'}).click();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('uml2tla_five_project')).states.find(x=>x.id==='cruise').x);
 const before=await read(),box=await page.locator('svg .state').first().boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+20,{steps:5});await page.mouse.up();
 const after=await read();expect(after).toBeGreaterThan(before);
 await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await read()).toBe(before);
 await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await read()).toBe(after);
 await page.locator('.sidebar').getByRole('button',{name:'Use case',exact:true}).click();
 await page.getByRole('button',{name:'Verify model',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Checks passed'})).toBeVisible({timeout:30000});
 await page.locator('.sidebar').getByRole('button',{name:'State machine',exact:true}).click();expect(await read()).toBe(after);
 await page.reload();await page.locator('.resume-button').click();
 await page.locator('.sidebar').getByRole('button',{name:'Use case',exact:true}).click();
 await page.locator('.sidebar').getByRole('button',{name:'State machine',exact:true}).click();expect(await read()).toBe(after);
 await page.getByRole('button',{name:'Fit diagram',exact:true}).click();
 await page.getByRole('button',{name:'Properties',exact:true}).click();await expect(page.locator('.properties-panel')).toBeVisible();
});

test('Mobile navigation and canvas do not overflow horizontally',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Open workspace'}).click();
 await page.getByRole('button',{name:'Toggle navigation'}).click();
 await page.locator('.sidebar').getByRole('button',{name:'Use case',exact:true}).click();
 await expect(page.getByRole('button',{name:'Verify model',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Properties',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('tab',{name:'Contracts',exact:true}).click();
 await expect(page.getByText('Use-case TLC Contracts',{exact:true})).toBeVisible();
});
