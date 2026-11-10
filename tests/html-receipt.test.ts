import {it,expect} from 'vitest';
import {extractEmlPlainText} from '../src/eml';
import {parse} from '../src/parse';
const email=(html:string)=>new TextEncoder().encode('Content-Type: text/html; charset=utf-8\r\n\r\n'+html);
it('imports table receipts and entities into the ordinary field review',()=>{
const text=extractEmlPlainText(email('<h1>Store: Cedar &amp; Finch</h1><table><tr><td>Order number:</td><td>CF-2048</td></tr><tr><td>Order date:</td><td>2026-11-01</td></tr><tr><td>Total:</td><td>&pound;52.00</td></tr></table>'));
expect(parse(text)).toMatchObject({merchant:'Cedar & Finch',orderNo:'CF-2048',orderDate:'2026-11-01',total:'£52.00'});
});
it('omits execution, resources, attributes, hidden previews and attached UI text',()=>{
const text=extractEmlPlainText(email('<head><title>Wrong</title><style>.x{}</style></head><body><div hidden>Order #HIDDEN</div><div style="display: none !important">Order #SECRET</div><div aria-hidden="true">Order #ARIA</div><script>fetch("https://example.test")</script><iframe src="https://example.test">Wrong</iframe><img src="https://example.test/pixel" alt="Order #ALT"><a href="https://example.test">Store: Real</a><p>Order #REAL-42</p></body>'));
expect(text).toBe('Store: Real\nOrder #REAL-42');
});
it('prefers authored plain text even when HTML appears earlier',()=>{
const raw='Content-Type: multipart/alternative; boundary=x\r\n\r\n--x\r\nContent-Type: text/html\r\n\r\n<p>Order #HTML-42</p>\r\n--x\r\nContent-Type: text/plain\r\n\r\nOrder #PLAIN-42\r\n--x--';
expect(extractEmlPlainText(new TextEncoder().encode(raw))).toBe('Order #PLAIN-42');
});
it('does not import an HTML attachment',()=>{expect(()=>extractEmlPlainText(new TextEncoder().encode('Content-Type: text/html\r\nContent-Disposition: attachment; filename="receipt.html"\r\n\r\n<p>Order #ATTACH-42</p>'))).toThrow(/No readable/);});
it('refuses HTML consisting only of hidden or executable content',()=>{expect(()=>extractEmlPlainText(email('<script>Order #FAKE-42</script><div hidden>Store: Fake</div>'))).toThrow(/No readable/);});
