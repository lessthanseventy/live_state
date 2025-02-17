defmodule LiveState.Test.SocketyChannel do
  use LiveState.Channel, web_module: LiveState.Test.Web
  alias LiveState.Event

  def init(_channel, _payload, socket) do
    {:ok, %{foo: "bar"}, socket |> assign(:baz, "bing")}
  end

  def handle_event("something_sockety", %{"baz" => new_baz}, %{foo: foo}, %{assigns: %{baz: baz}} = socket) do
    {:noreply, %{foo: "altered #{foo}"}, socket |> assign(:baz, new_baz)}
  end

end
