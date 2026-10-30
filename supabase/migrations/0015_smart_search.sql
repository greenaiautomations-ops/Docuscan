-- Semantic ranking remains within the requested library and current RLS scope.
create function public.search_document_embeddings(p_owner uuid,p_embedding vector(512),p_limit integer default 10)
returns table(document_id uuid,title text,excerpt text,similarity double precision)
language plpgsql stable security definer set search_path=public,extensions as $$
begin
 if not can_workspace(p_owner) then raise exception 'Workspace access denied'; end if;
 if effective_plan(p_owner) not in ('pro','enterprise') then raise exception 'Smart search requires Pro or Business'; end if;
 return query
 select ranked.document_id,ranked.title,left(ranked.content,500),ranked.score
 from (
   select distinct on(d.id) d.id document_id,d.title,e.content,1-(e.embedding <=> p_embedding) score
   from document_embeddings e join documents d on d.id=e.document_id
   where d.user_id=p_owner and not d.is_archived and e.embedding is not null and can_workspace(d.user_id)
   order by d.id,e.embedding <=> p_embedding
 ) ranked where ranked.score>0.15 order by ranked.score desc limit least(greatest(p_limit,1),20);
end $$;
revoke all on function search_document_embeddings(uuid,vector,integer) from public,anon;
grant execute on function search_document_embeddings(uuid,vector,integer) to authenticated;
